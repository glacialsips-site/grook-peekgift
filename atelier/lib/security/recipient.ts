import 'server-only';
import { createHmac } from 'node:crypto';
import { env } from '@/lib/env';

export class GuestSecretMissingError extends Error {
  constructor() {
    super('guest_claim_token_secret_missing');
    this.name = 'GuestSecretMissingError';
  }
}

export function signRecipient(sessionId: string): string {
  const secret = env.GUEST_CLAIM_TOKEN_SECRET;
  if (!secret) throw new GuestSecretMissingError();
  return createHmac('sha256', secret).update(sessionId).digest('hex');
}

export function trySignRecipient(sessionId: string): string | null {
  try {
    return signRecipient(sessionId);
  } catch (err) {
    if (err instanceof GuestSecretMissingError) return null;
    throw err;
  }
}
