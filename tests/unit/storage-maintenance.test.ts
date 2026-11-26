import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { withStorageMutation, withStorageReconciliation } from '@/lib/storage-maintenance';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function directory() {
  const root = await mkdtemp(join(tmpdir(), 'coex-storage-lock-'));
  directories.push(root);
  return root;
}

it('refuses reconciliation until an in-flight writer finishes', async () => {
  const root = await directory();
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writer = withStorageMutation(root, async () => {
    started();
    await held;
  });
  await ready;
  try {
    await expect(withStorageReconciliation(root, async () => 1)).rejects.toThrow(
      'Storage writes are active',
    );
  } finally {
    release();
    await writer;
  }
  await expect(withStorageReconciliation(root, async () => 2)).resolves.toBe(2);
});

it('rejects new writes and competing reconciliation while maintenance owns the disk', async () => {
  const root = await directory();
  await withStorageReconciliation(root, async () => {
    await expect(withStorageMutation(root, async () => 'unsafe')).rejects.toThrow(
      'Storage maintenance',
    );
    await expect(withStorageReconciliation(root, async () => 'unsafe')).rejects.toThrow(
      'already locked',
    );
  });
  await expect(withStorageMutation(root, async () => 'safe')).resolves.toBe('safe');
});

it('releases writer and maintenance markers when work fails', async () => {
  const root = await directory();
  await expect(
    withStorageMutation(root, async () => {
      throw Error('write failed');
    }),
  ).rejects.toThrow('write failed');
  await expect(
    withStorageReconciliation(root, async () => {
      throw Error('scan failed');
    }),
  ).rejects.toThrow('scan failed');
  await expect(withStorageReconciliation(root, async () => 'recovered')).resolves.toBe('recovered');
});
