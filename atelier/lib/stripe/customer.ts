import 'server-only';
import type Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'lib/stripe/customer' });

async function emailForClerkUser(clerkUserId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(clerkUserId);
    return (
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch (err) {
    log.warn('clerk_lookup_failed', {
      clerkUserId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getOrCreateCustomer(
  clerkUserId: string,
  hint?: { email?: string | null; name?: string | null },
): Promise<Stripe.Customer> {
  const stripe = getStripe();
  const email = hint?.email ?? (await emailForClerkUser(clerkUserId));

  if (email) {
    const existing = await stripe.customers.list({ email, limit: 10 });
    const match =
      existing.data.find((c) => c.metadata?.['clerk_user_id'] === clerkUserId) ??
      existing.data[0];
    if (match) {
      if (match.metadata?.['clerk_user_id'] !== clerkUserId) {
        await stripe.customers.update(match.id, {
          metadata: { ...match.metadata, clerk_user_id: clerkUserId },
        });
      }
      return match;
    }
  }

  return stripe.customers.create({
    email: email ?? undefined,
    name: hint?.name ?? undefined,
    metadata: { clerk_user_id: clerkUserId },
  });
}
