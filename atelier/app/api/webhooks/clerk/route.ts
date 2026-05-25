import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { getSupabaseService } from '@/lib/supabase/service';
import { inngest } from '@/lib/inngest/client';

async function logWebhook(payload: Record<string, unknown>, success: boolean) {
  try {
    await inngest.send({
      name: 'peek/webhook.received',
      data: { source: 'clerk', payload, success },
    });
  } catch {}
}

export async function POST(req: Request) {
  const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return new Response('webhook not configured', { status: 500 });

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
      const { error } = await db
        .from('users')
        .upsert(
          {
            clerk_user_id: u.id,
            email,
            display_name: displayName,
            avatar_url: u.image_url ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_user_id' },
        );
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
