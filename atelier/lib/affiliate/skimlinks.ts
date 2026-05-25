import { env } from '@/lib/env';

export interface SkimlinksWrap {
  wrappedUrl: string;
  network: 'skimlinks';
}

export function wrapSkimlinks(
  originalUrl: string,
  customId?: string,
): SkimlinksWrap | null {
  if (!env.SKIMLINKS_PUBLISHER_ID) return null;
  const params = new URLSearchParams({
    id: env.SKIMLINKS_PUBLISHER_ID,
    url: originalUrl,
  });
  if (customId) params.set('xs', customId);
  return {
    wrappedUrl: `https://go.skimresources.com/?${params.toString()}`,
    network: 'skimlinks',
  };
}
