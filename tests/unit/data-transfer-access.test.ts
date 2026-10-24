import { beforeEach, describe, expect, it, vi } from 'vitest';
const { actorCan } = vi.hoisted(() => ({ actorCan: vi.fn() }));
vi.mock('@/modules/crm/services/access.service', () => ({ actorCan }));
import { assertTransferAccess } from '@/modules/data-transfer/service';
import { ENTITIES } from '@/modules/data-transfer/spec';
describe('bulk transfer permissions', () => {
  beforeEach(() => actorCan.mockReset());
  it.each(ENTITIES)('requires tenant administration for %s', async (entity) => {
    actorCan.mockResolvedValue(false);
    await expect(assertTransferAccess(entity)).rejects.toThrow('permission');
  });
  it('does not let tenant.manage replace module read or write permissions', async () => {
    actorCan.mockImplementation(async (p: string) => p === 'tenant.manage');
    await expect(assertTransferAccess('tasks')).rejects.toThrow('permission');
    actorCan.mockImplementation(async (p: string) => p !== 'products.manage');
    await expect(assertTransferAccess('products', true)).rejects.toThrow('permission');
    await expect(assertTransferAccess('products')).resolves.toBeUndefined();
  });
});
