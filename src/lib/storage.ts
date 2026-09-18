import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

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
  return resolve(process.env.STORAGE_DIR ?? '.storage');
}

function safePath(key: string): string {
  const root = rootDirectory();
  const full = resolve(join(root, key));

  // A key is generated here, never supplied by a caller, but a traversal check costs nothing and
  // turns a future mistake into an error rather than a file read from outside the store.
  if (!full.startsWith(root)) throw new Error('That file key is not inside the store.');

  return full;
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
    const key = keyFor(tenantId, fileName);
    const path = safePath(key);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);

    return {
      key,
      bytes: body.byteLength,
      checksum: createHash('sha256').update(body).digest('hex'),
    };
  },

  async get(key) {
    return readFile(safePath(key));
  },

  async remove(key) {
    await rm(safePath(key), { force: true });
  },
};

export function fileStorage(): FileStorage {
  // Object storage joins here, chosen by an environment variable, once the hosting decision is
  // made. Until then there is one implementation and no configuration to get wrong.
  return localStorage;
}
