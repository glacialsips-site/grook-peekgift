import { wrapSkimlinks } from './skimlinks';
import { wrapSovrn } from './sovrn';

export type AffiliateNetwork = 'skimlinks' | 'sovrn' | 'direct';

export interface WrappedLink {
  wrappedUrl: string;
  network: AffiliateNetwork;
  commissionPctEstimate: number | null;
}

const COMMISSION_DEFAULTS: Record<AffiliateNetwork, number | null> = {
  skimlinks: 5,
  sovrn: 4,
  direct: null,
};

export function wrapAffiliateLink(
  originalUrl: string,
  customId?: string,
): WrappedLink {
  const s = wrapSkimlinks(originalUrl, customId);
  if (s) {
    return {
      wrappedUrl: s.wrappedUrl,
      network: s.network,
      commissionPctEstimate: COMMISSION_DEFAULTS.skimlinks,
    };
  }
  const v = wrapSovrn(originalUrl, customId);
  if (v) {
    return {
      wrappedUrl: v.wrappedUrl,
      network: v.network,
      commissionPctEstimate: COMMISSION_DEFAULTS.sovrn,
    };
  }
  return {
    wrappedUrl: originalUrl,
    network: 'direct',
    commissionPctEstimate: COMMISSION_DEFAULTS.direct,
  };
}

export function buildClickCustomId(peekId: string, cardId?: string): string {
  return cardId ? `${peekId}:${cardId}` : peekId;
}

export function parseClickCustomId(
  customId: string | null | undefined,
): { peekId: string; cardId: string | null } | null {
  if (!customId) return null;
  const [peekId, cardId] = customId.split(':');
  if (!peekId) return null;
  return { peekId, cardId: cardId ?? null };
}
