import { env } from '@/lib/env';

export interface SovrnWrap {
  wrappedUrl: string;
  network: 'sovrn';
}

export function wrapSovrn(
  originalUrl: string,
  customId?: string,
): SovrnWrap | null {
  if (!env.SOVRN_API_KEY) return null;
  const params = new URLSearchParams({
    key: env.SOVRN_API_KEY,
    u: originalUrl,
  });
  if (customId) params.set('cid', customId);
  return {
    wrappedUrl: `https://redirect.viglink.com/?${params.toString()}`,
    network: 'sovrn',
  };
}
