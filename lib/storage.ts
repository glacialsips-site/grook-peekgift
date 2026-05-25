// Netlify Blobs adapter. Zero-config in production (Netlify injects the runtime token),
// falls back to local on-disk for dev. Used for uploaded photos, generated hero images,
// voice notes, OG image cache.

import { getStore } from '@netlify/blobs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

interface PutOpts {
  contentType?: string;
  cacheControl?: string;
}

interface StoredObject {
  key: string;
  publicUrl: string;
  contentType?: string;
}

// Single namespace; key prefixes keep things organized.
const STORE_NAME = 'peek-v2';

function isOnNetlify(): boolean {
  return !!process.env.NETLIFY || !!process.env.NETLIFY_DEV || !!process.env.BLOBS_CONTEXT;
}

export async function putBytes(
  key: string,
  bytes: Uint8Array,
  opts: PutOpts = {}
): Promise<StoredObject> {
  if (isOnNetlify()) {
    const store = getStore(STORE_NAME);
    await store.set(key, bytes, {
      metadata: { contentType: opts.contentType || 'application/octet-stream' }
    });
    return {
      key,
      publicUrl: `${APP_URL}/api/blob/${encodeURIComponent(key)}`,
      contentType: opts.contentType
    };
  }
  // Dev fallback: write into .next/cache/blobs/
  const root = path.join(process.cwd(), '.next', 'cache', 'blobs');
  const file = path.join(root, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return {
    key,
    publicUrl: `${APP_URL}/api/blob/${encodeURIComponent(key)}`,
    contentType: opts.contentType
  };
}

export async function getBytes(key: string): Promise<{ bytes: Uint8Array; contentType?: string } | null> {
  if (isOnNetlify()) {
    const store = getStore(STORE_NAME);
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!result) return null;
    const meta = result.metadata as any;
    return {
      bytes: new Uint8Array(result.data as ArrayBuffer),
      contentType: meta?.contentType || 'application/octet-stream'
    };
  }
  const file = path.join(process.cwd(), '.next', 'cache', 'blobs', key);
  try {
    const bytes = await fs.readFile(file);
    return { bytes: new Uint8Array(bytes), contentType: 'application/octet-stream' };
  } catch {
    return null;
  }
}

export function blobKey(prefix: string, userId: string | null, ext: string): string {
  const slug = Math.random().toString(36).slice(2, 10);
  const ts = Date.now();
  const user = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) : 'anon';
  const safeExt = (ext || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${prefix}/${user}/${ts}-${slug}.${safeExt}`;
}
