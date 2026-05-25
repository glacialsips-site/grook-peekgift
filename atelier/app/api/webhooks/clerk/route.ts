import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

// NOTE: this Supabase service client is inlined here to keep this packet's build
// green standalone. Packet 04 will provide `@/lib/supabase/service`; once that
// merges, swap the call below to `import { getSupabaseService } from '@/lib/supabase/service'`.
function getSupabaseService() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'peek_v2' },
    },
  );
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
    return new Response('invalid signature', { status: 401 });
  }

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

  return new Response('ok', { status: 200 });
}
