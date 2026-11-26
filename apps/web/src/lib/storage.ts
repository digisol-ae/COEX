import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { DEFAULT_STORAGE_LIMIT_BYTES } from '@coex/shared/core/saas';
import { connectToDatabase } from './db';
import { getContext, peekContext } from './tenant-context';
import { assertWorkspaceAccess } from '@/modules/core/services/workspace-access.service';
import { withStorageMutation } from './storage-maintenance';

/**
 * Where uploaded files live.
 *
 * Files never go into MongoDB. A document store is a poor filesystem, and a database whose size is
 * driven by screenshots is a database nobody can afford to back up, which is the opposite of what
 * backups are for.
 *
 * One interface, two implementations. Local disk is what development uses and what a single server
 * deployment can keep using; object storage arrives behind the same interface when the hosting
 * decision is made, and nothing outside this file changes. That decision is deliberately not
 * encoded anywhere else.
 *
 * A key is opaque and carries the tenant, so a stray key cannot be read across tenants even if one
 * leaked: reads go through the service, which checks the tenant before it ever gets here.
 */

export interface StoredFile {
  key: string;
  bytes: number;
  checksum: string;
}

export interface FileStorage {
  put(input: {
    tenantId: string;
    fileName: string;
    contentType: string;
    body: Buffer;
  }): Promise<StoredFile>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Everything is written under one root, and nothing may escape it. */
function rootDirectory(): string {
  // The turbopackIgnore hint tells the build this path is resolved at run time, so it stops tracing
  // the whole project into the server bundle (the four storage.ts build warnings).
  return resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? '.storage');
}

function safePath(key: string): string {
  const root = rootDirectory();
  const full = resolve(/* turbopackIgnore: true */ join(root, key));

  // A key is generated here, never supplied by a caller, but a traversal check costs nothing and
  // turns a future mistake into an error rather than a file read from outside the store.
  if (!full.startsWith(root + sep)) throw new Error('That file key is not inside the store.');

  return full;
}

function tenantFromKey(key: string) {
  const parts = key.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\')))
    throw new Error('Invalid storage key.');
  const tenantId = parts[0];
  if (!/^[a-f0-9]{24}$/i.test(tenantId)) throw new Error('Invalid storage tenant.');
  const context = peekContext();
  if (context && String(context.tenantId) !== tenantId)
    throw new Error('This file belongs to another workspace.');
  return tenantId;
}

/** Count existing files once before the first reservation. CAS prevents competing initialisers
 * from overwriting reservations. All writers must share the same storage backend. */
async function diskUsage(directory: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }
  let bytes = 0;
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) bytes += await diskUsage(path);
    else if (entry.isFile()) bytes += (await stat(path)).size;
  }
  return bytes;
}

export async function initialiseStorageUsage(tenantId: string): Promise<number> {
  if (!/^[a-f0-9]{24}$/i.test(tenantId)) throw new Error('Invalid storage tenant.');
  await connectToDatabase();
  let tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant) throw new Error('Workspace not found.');
  if (tenant.storageUsedBytes == null) {
    const bytes = await diskUsage(safePath(tenantId));
    await TenantModel.updateOne(
      { _id: tenantId, storageUsedBytes: null },
      { $set: { storageUsedBytes: bytes } },
    );
    tenant = await TenantModel.findById(tenantId);
  }
  return tenant?.storageUsedBytes ?? 0;
}

async function reserveStorage(tenantId: string, bytes: number) {
  await assertWorkspaceAccess(tenantId);
  await initialiseStorageUsage(tenantId);
  const result = await TenantModel.updateOne(
    {
      _id: tenantId,
      deletedAt: null,
      status: 'active',
      $expr: {
        $lte: [
          { $add: ['$storageUsedBytes', bytes] },
          { $ifNull: ['$storageLimitBytes', DEFAULT_STORAGE_LIMIT_BYTES] },
        ],
      },
    },
    { $inc: { storageUsedBytes: bytes } },
  );
  if (result.modifiedCount !== 1 && bytes !== 0)
    throw new Error(
      'Your workspace storage limit has been reached. Ask the platform owner to increase it.',
    );
  if (result.matchedCount !== 1)
    throw new Error(
      'Your workspace storage limit has been reached. Ask the platform owner to increase it.',
    );
}

async function releaseStorage(tenantId: string, bytes: number) {
  await TenantModel.updateOne(
    { _id: tenantId, storageUsedBytes: { $gte: bytes } },
    { $inc: { storageUsedBytes: -bytes } },
  );
}

/** Keeps the original name for the download while making the stored name unguessable. */
function keyFor(tenantId: string, fileName: string): string {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const safeExtension = /^\.[A-Za-z0-9]{1,8}$/.test(extension) ? extension.toLowerCase() : '';

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return `${tenantId}/${month}/${randomUUID()}${safeExtension}`;
}

const localStorage: FileStorage = {
  async put({ tenantId, fileName, body }) {
    return withStorageMutation(rootDirectory(), async () => {
      if (String(getContext().tenantId) !== tenantId)
        throw new Error('This file belongs to another workspace.');
      if (!/^[a-f0-9]{24}$/i.test(tenantId)) throw new Error('Invalid storage tenant.');
      const key = keyFor(tenantId, fileName);
      const path = safePath(key);

      await reserveStorage(tenantId, body.byteLength);
      try {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, body, { flag: 'wx' });
      } catch (error) {
        // A failed write can leave a partial file. Remove it before releasing its reservation.
        await rm(path, { force: true }).catch((cleanupError: NodeJS.ErrnoException) => {
          // mkdir can fail because a parent is a file; then no partial file could exist.
          if (!['ENOENT', 'ENOTDIR'].includes(cleanupError.code ?? '')) throw cleanupError;
        });
        await releaseStorage(tenantId, body.byteLength);
        throw error;
      }

      return {
        key,
        bytes: body.byteLength,
        checksum: createHash('sha256').update(body).digest('hex'),
      };
    });
  },

  async get(key) {
    tenantFromKey(key);
    return readFile(safePath(key));
  },

  async remove(key) {
    return withStorageMutation(rootDirectory(), async () => {
      const tenantId = tenantFromKey(key);
      await initialiseStorageUsage(tenantId);
      const path = safePath(key);
      const tombstone = `${path}.removing-${randomUUID()}`;
      // Atomic rename gives exactly one remover ownership, avoiding a double quota refund.
      try {
        await rename(path, tombstone);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
      const bytes = (await stat(tombstone)).size;
      await rm(tombstone);
      await releaseStorage(tenantId, bytes);
    });
  },
};

export function fileStorage(): FileStorage {
  // Object storage joins here, chosen by an environment variable, once the hosting decision is
  // made. Until then there is one implementation and no configuration to get wrong.
  return localStorage;
}
