import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const maintenance = '.reconciliation-lock';
const operations = '.active-writes';

/** Shared-disk handshake: register a writer before checking the maintenance lock. */
export async function withStorageMutation<T>(root: string, work: () => Promise<T>): Promise<T> {
  const directory = join(root, operations);
  await mkdir(directory, { recursive: true });
  const marker = join(directory, randomUUID());
  await writeFile(marker, '', { flag: 'wx' });
  try {
    const locked = await stat(join(root, maintenance)).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return false;
        throw error;
      },
    );
    if (locked) throw new Error('Storage maintenance is running. Please try again shortly.');
    return await work();
  } finally {
    await rm(marker, { force: true });
  }
}

/** A crashed writer leaves a marker: fail closed until an operator verifies and clears it. */
export async function withStorageReconciliation<T>(
  root: string,
  work: () => Promise<T>,
): Promise<T> {
  await mkdir(root, { recursive: true });
  const lock = join(root, maintenance);
  await mkdir(lock).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EEXIST') throw new Error('Storage reconciliation is already locked.');
    throw error;
  });
  try {
    const active = await readdir(join(root, operations)).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    if (active.length)
      throw new Error(
        'Storage writes are active or need crash recovery. Try again after they finish.',
      );
    return await work();
  } finally {
    await rm(lock, { recursive: true });
  }
}
