import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { inngest } from '@/lib/inngest/client';
import { checkIdempotency } from '@/lib/security/idempotency';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'api/webhooks/clerk' });

async function logWebhook(payload: Record<string, unknown>, success: boolean) {
  try {
    await inngest.send({
      name: 'peek/webhook.received',
      data: { source: 'clerk', payload, success },
    });
  } catch (err) {
    log.warn('inngest_publish_failed', {
      source: 'clerk',
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(req: Request) {
  const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // No signing secret configured: gracefully no-op so unkeyed deliveries
    // don't pile up as failed retries on Clerk's side. Log so we notice if
    // events arrive before the integration is provisioned.
    log.warn('webhook_unconfigured', {
      reason: 'CLERK_WEBHOOK_SIGNING_SECRET unset',
    });
    return Response.json(
      { received: true, skipped: 'service_not_configured' },
      { status: 200 },
    );
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('missing svix headers', { status: 400 });
  }

  const body = await req.text();
  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    await logWebhook({ error: 'invalid_signature' }, false);
    return new Response('invalid signature', { status: 401 });
  }

  const idemp = await checkIdempotency({ source: 'clerk', eventId: svix_id });
  if (!idemp.firstSeen) {
    void logWebhook({ svix_id, type: evt.type, idempotent: true }, true);
    return new Response('ok', { status: 200 });
  }

  let success = false;
  try {
    const db = getSupabaseService();

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const u = evt.data;
      const email =
        u.email_addresses.find((e) => e.id === u.primary_email_address_id)
          ?.email_address ?? null;
      const displayName =
        [u.first_name, u.last_name].filter(Boolean).join(' ') || null;

      // Always upsert — the row must exist for downstream FK references
      // (curator_id, etc.). user.created with no primary email yet (OAuth
      // race, pending verification) inserts NULL; user.updated with a missing
      // email omits the column so the previously-resolved value is preserved.
      const payload: Record<string, unknown> = {
        clerk_user_id: u.id,
        display_name: displayName,
        avatar_url: u.image_url ?? null,
        updated_at: new Date().toISOString(),
      };
      if (email !== null) {
        payload['email'] = email;
      } else if (evt.type === 'user.created') {
        payload['email'] = null;
      }

      const { error } = await db
        .from('users')
        .upsert(payload, { onConflict: 'clerk_user_id' });
      if (error) {
        return new Response(`upsert failed: ${error.message}`, { status: 500 });
      }
    }

    if (evt.type === 'user.deleted') {
      if (evt.data.id) {
        const { error } = await db
          .from('users')
          .delete()
          .eq('clerk_user_id', evt.data.id);
        if (error) {
          return new Response(`delete failed: ${error.message}`, { status: 500 });
        }
      }
    }

    success = true;
    return new Response('ok', { status: 200 });
  } finally {
    void logWebhook({ type: evt.type }, success);
  }
}
