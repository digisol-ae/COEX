import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../../../tests/setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { createSession } from '@/modules/core/services/session.service';
import { createApp } from '../src/app';
import { readCookie } from '../src/http/middleware';

const app = createApp({ allowedOrigins: ['https://coex.digisol.ae'] });

const tenantId = new Types.ObjectId();
const otherTenantId = new Types.ObjectId();
const managerId = new Types.ObjectId();
const salesId = new Types.ObjectId();
const readerId = new Types.ObjectId();
const strangerId = new Types.ObjectId();

async function cookieFor(userId: Types.ObjectId, tenant = tenantId): Promise<string> {
  const { token } = await createSession({ userId, tenantId: tenant });
  return `coex_session=${token}`;
}

beforeAll(async () => {
  await connectForTests('api');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create([
    { _id: tenantId, name: 'DigiSol', slug: 'digisol' },
    { _id: otherTenantId, name: 'Other Co', slug: 'other' },
  ]);
  await UserModel.create([
    {
      _id: managerId,
      tenantId,
      name: 'Mina Manager',
      email: 'm@x.com',
      role: 'manager',
      status: 'active',
    },
    {
      _id: salesId,
      tenantId,
      name: 'Sam Sales',
      email: 's@x.com',
      role: 'agent',
      status: 'active',
      permissionGrants: ['lead.manage'],
    },
    { _id: readerId, tenantId, name: 'Reader', email: 'r@x.com', role: 'agent', status: 'active' },
    {
      _id: strangerId,
      tenantId: otherTenantId,
      name: 'Stranger',
      email: 'x@other.com',
      role: 'manager',
      status: 'active',
    },
  ]);
});

describe('readCookie', () => {
  it('finds a cookie among several and decodes it', () => {
    expect(readCookie('a=1; coex_session=abc%2Fdef; b=2', 'coex_session')).toBe('abc/def');
    expect(readCookie('a=1', 'coex_session')).toBeNull();
    expect(readCookie(undefined, 'coex_session')).toBeNull();
    expect(readCookie('coex_session=%E0%A4%A', 'coex_session')).toBeNull();
  });
});

describe('system routes', () => {
  it('answers the health check without a session and tags every response with a request id', async () => {
    const response = await request(app).get('/api/v2/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(response.headers['x-request-id']).toMatch(/^[a-f0-9]{8}$/);
  });

  it('refuses a request with no session, a bad token or an ended session', async () => {
    expect((await request(app).get('/api/v2/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/v2/me').set('Cookie', 'coex_session=nonsense')).status,
    ).toBe(401);

    const cookie = await cookieFor(readerId);
    await UserModel.updateOne({ _id: readerId }, { $set: { status: 'suspended' } });
    expect((await request(app).get('/api/v2/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('returns who is signed in, from the same cookie the web app uses', async () => {
    const response = await request(app)
      .get('/api/v2/me')
      .set('Cookie', await cookieFor(managerId));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: 'Mina Manager',
      role: 'manager',
      tenantName: 'DigiSol',
      theme: 'sunset',
    });
    expect(response.body.permissions).toContain('lead.read.all');
  });
});

describe('leads route', () => {
  it('needs the permission, and says so with 403', async () => {
    const response = await request(app)
      .get('/api/v2/leads')
      .set('Cookie', await cookieFor(readerId));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('forbidden');
  });

  it('shows a salesperson their own leads and a manager every lead, scoped to the tenant', async () => {
    const { createLead } = await import('@/modules/crm/services/lead.service');
    const { runWithContext } = await import('@/lib/tenant-context');
    const as = (userId: Types.ObjectId, tenant = tenantId) => ({
      tenantId: tenant,
      userId,
      isPlatformAdmin: false,
    });

    await runWithContext(as(salesId), () => createLead({ name: 'Mine', source: 'Referral' }));
    await runWithContext(as(managerId), () => createLead({ name: 'Managers' }));
    await runWithContext(as(strangerId, otherTenantId), () => createLead({ name: 'Other tenant' }));

    const mine = await request(app)
      .get('/api/v2/leads')
      .set('Cookie', await cookieFor(salesId));
    expect(mine.status).toBe(200);
    expect(mine.body.leads.map((lead: { name: string }) => lead.name)).toEqual(['Mine']);
    expect(mine.body.sources).toContain('Referral');
    expect(typeof mine.body.leads[0].createdAt).toBe('string');

    const all = await request(app)
      .get('/api/v2/leads')
      .set('Cookie', await cookieFor(managerId));
    expect(all.body.leads.map((lead: { name: string }) => lead.name).sort()).toEqual([
      'Managers',
      'Mine',
    ]);

    const filtered = await request(app)
      .get('/api/v2/leads?q=manag')
      .set('Cookie', await cookieFor(managerId));
    expect(filtered.body.leads).toHaveLength(1);
  });

  it('rejects a query that is not valid with 400 and says which field', async () => {
    const response = await request(app)
      .get('/api/v2/leads?status=bogus')
      .set('Cookie', await cookieFor(managerId));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_request');
    expect(response.body.error.details[0].path).toBe('status');
  });
});

describe('leads write routes', () => {
  it('creates, edits, works, disqualifies and archives a lead as its owner', async () => {
    const cookie = await cookieFor(salesId);

    const created = await request(app)
      .post('/api/v2/leads')
      .set('Cookie', cookie)
      .send({ name: 'Acme Dental', email: 'a@acme.com' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    expect(
      (
        await request(app)
          .put(`/api/v2/leads/${id}`)
          .set('Cookie', cookie)
          .send({ name: 'Acme Dental Group', email: 'a@acme.com' })
      ).status,
    ).toBe(200);

    expect(
      (await request(app).post(`/api/v2/leads/${id}/start-working`).set('Cookie', cookie)).status,
    ).toBe(200);

    const noReason = await request(app)
      .post(`/api/v2/leads/${id}/disqualify`)
      .set('Cookie', cookie)
      .send({ reason: ' ' });
    expect(noReason.status).toBe(422);

    expect(
      (
        await request(app)
          .post(`/api/v2/leads/${id}/disqualify`)
          .set('Cookie', cookie)
          .send({ reason: 'No budget' })
      ).status,
    ).toBe(200);

    expect(
      (await request(app).post(`/api/v2/leads/${id}/archive`).set('Cookie', cookie)).status,
    ).toBe(200);

    const list = await request(app).get('/api/v2/leads').set('Cookie', cookie);
    expect(list.body.leads).toHaveLength(0);
  });

  it('answers 409 with who it looks like, and saves when confirmed', async () => {
    const cookie = await cookieFor(salesId);
    const first = { name: 'First', email: 'same@x.com' };

    await request(app).post('/api/v2/leads').set('Cookie', cookie).send(first);

    const again = await request(app).post('/api/v2/leads').set('Cookie', cookie).send(first);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('duplicate');
    expect(again.body.error.details[0]).toMatchObject({ kind: 'lead', reasons: ['email'] });

    const forced = await request(app)
      .post('/api/v2/leads')
      .set('Cookie', cookie)
      .send({ ...first, confirmDuplicates: true });
    expect(forced.status).toBe(201);

    const probe = await request(app)
      .post('/api/v2/leads/duplicates')
      .set('Cookie', cookie)
      .send({ email: 'same@x.com' });
    expect(probe.body.duplicates).toHaveLength(2);
  });

  it('refuses a person without lead.manage with 403 and another salesperson’s lead with 422', async () => {
    const created = await request(app)
      .post('/api/v2/leads')
      .set('Cookie', await cookieFor(managerId))
      .send({ name: 'Managers' });

    expect(
      (
        await request(app)
          .post('/api/v2/leads')
          .set('Cookie', await cookieFor(readerId))
          .send({ name: 'Nope' })
      ).status,
    ).toBe(403);

    const foreign = await request(app)
      .post(`/api/v2/leads/${created.body.id}/archive`)
      .set('Cookie', await cookieFor(salesId));
    expect(foreign.status).toBe(422);
    expect(foreign.body.error.message).toBe('Lead not found.');
  });

  it('rejects a malformed id with 400', async () => {
    const response = await request(app)
      .post('/api/v2/leads/not-an-id/archive')
      .set('Cookie', await cookieFor(salesId));

    expect(response.status).toBe(400);
  });
});

describe('errors and origin', () => {
  it('returns the standard shape for an unknown route', async () => {
    const response = await request(app).get('/api/v2/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });

  it('refuses a write that comes from another site, and lets our own origin through to routing', async () => {
    const foreign = await request(app)
      .post('/api/v2/leads')
      .set('Origin', 'https://evil.example')
      .send({});
    expect(foreign.status).toBe(403);
    expect(foreign.body.error.code).toBe('bad_origin');

    const ours = await request(app)
      .post('/api/v2/leads')
      .set('Origin', 'https://coex.digisol.ae')
      .send({});
    // The origin is accepted; there is simply no write route yet.
    expect(ours.status).toBe(404);
  });
});

describe('openapi', () => {
  it('lists the declared routes, their permissions and their schemas', async () => {
    const response = await request(app).get('/api/v2/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/api/v2/health',
        '/api/v2/me',
        '/api/v2/leads',
        '/api/v2/auth/login',
        '/api/v2/auth/logout',
        '/api/v2/auth/entra',
        '/api/v2/auth/entra/callback',
      ]),
    );

    const leads = response.body.paths['/api/v2/leads'].get;
    expect(leads.description).toContain('lead.read');
    expect(leads.parameters.map((parameter: { name: string }) => parameter.name)).toEqual(
      expect.arrayContaining(['status', 'source', 'ownerId', 'q']),
    );
    expect(
      leads.responses['200'].content['application/json'].schema.properties.leads,
    ).toBeDefined();
  });
});
