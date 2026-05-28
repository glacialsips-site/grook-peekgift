import type { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { chatTurn, DEFAULT_MODEL } from '@/lib/anthropic';
import '@/lib/anthropic/tools/bootstrap';
import { moderateInput, type ModerationResult } from '@/lib/anthropic/moderation';
import { getCurrentUser, getUserId } from '@/lib/auth/server';
import {
  ANON_TURN_CAP,
  anonymousTurnCount,
  anonymousTurnExceeded,
  assertPeekAccess,
  incrementAnonymousTurn,
} from '@/lib/chat/session';
import { classifyOccasionToTemplate } from '@/lib/anthropic/classify-occasion';
import type {
  OccasionType,
  ThreadPhase,
} from '@/lib/anthropic/system-prompt';
import {
  appendChatMessage,
  loadChatHistory,
} from '@/lib/chat/persistence';
import { track } from '@/lib/analytics/facade';
import { checkAllowed } from '@/lib/usage/throttle';
import { logger } from '@/lib/logger';
import { ChatRequestSchema, type SseEvent, type TurnUsage } from './schema';
import {
  enforceRateLimit,
  limiters,
  rateLimitResponse,
} from '@/lib/rate-limit/redis';
import { getClientIp } from '@/lib/security/client-ip';
import { isOriginAllowed, originRejectionResponse } from '@/lib/security/origin';
import { loadPeekSnapshot } from '@/lib/peek/snapshot';
import { db } from '@/db/client';
import { peeks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSupabaseService } from '@/lib/supabase/service';

const log = logger.child({ component: 'api/chat' });

const FRIENDLY_UPSTREAM_MSG =
  "We're having trouble connecting to the AI. Give it a moment and try again.";

function isUpstreamError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    status?: number;
    statusCode?: number;
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  const status = e.status ?? e.statusCode;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  const code = e.code ?? e.cause?.code;
  if (typeof code === 'string') {
    if (
      code.startsWith('ECONN') ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code.startsWith('UND_ERR_')
    ) {
      return true;
    }
  }
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (
    msg.includes('socket hang up') ||
    msg.includes('fetch failed') ||
    msg.includes('network request failed') ||
    msg.includes('terminated')
  ) {
    return true;
  }
  return false;
}

function stripAttachmentGuidanceFromContent(
  content: Anthropic.MessageParam['content'],
): Anthropic.MessageParam['content'] {
  if (!Array.isArray(content)) return content;
  return content.filter((block) => {
    if (!block || typeof block !== 'object') return true;
    const b = block as { type?: string; text?: string };
    if (b.type !== 'text' || typeof b.text !== 'string') return true;
    return !b.text.startsWith('[system] The curator just attached');
  }) as Anthropic.MessageParam['content'];
}

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function encodeSseEvent(event: SseEvent): Uint8Array {
  const payload = `event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`;
  return encoder.encode(payload);
}

function toTurnUsage(usage: Anthropic.Usage): TurnUsage {
  const out: TurnUsage = {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  };
  if (typeof usage.cache_read_input_tokens === 'number') {
    out.cache_read_input_tokens = usage.cache_read_input_tokens;
  }
  if (typeof usage.cache_creation_input_tokens === 'number') {
    out.cache_creation_input_tokens = usage.cache_creation_input_tokens;
  }
  return out;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isOriginAllowed(req)) {
    return originRejectionResponse();
  }

  const userId = await getUserId();
  const ip = getClientIp(req);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'bad_request', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { peekId, sessionId, history, userMessage, attachments, model } =
    parsed.data;

  const access = await assertPeekAccess({ peekId, userId, sessionId });
  if (!access.ok) {
    return Response.json(
      { error: access.reason },
      { status: access.reason === 'forbidden' ? 403 : 404 },
    );
  }

  const ipVerdict = await enforceRateLimit(limiters.chatPerIp(), ip);
  if (!ipVerdict.ok) return rateLimitResponse(ipVerdict);

  if (userId) {
    const userVerdict = await enforceRateLimit(
      limiters.chatPerUser(),
      userId,
    );
    if (!userVerdict.ok) return rateLimitResponse(userVerdict);
  } else {
    const anonRlKey = `${ip}:${sessionId}`;
    const anonVerdict = await enforceRateLimit(limiters.chatAnon(), anonRlKey);
    if (!anonVerdict.ok) return rateLimitResponse(anonVerdict);

    // C03 from BUGS-CHAT-LOOP: increment first, check post-increment. Closes
    // the TOCTOU race where two parallel anon turns both pass a stale count.
    const nextCount = await incrementAnonymousTurn(sessionId, ip);
    if (anonymousTurnExceeded(nextCount)) {
      const signupMessage =
        "You're at the trial limit. Sign up to keep building — your peek will be saved.";
      const sseBody =
        `event: tier_limit_reached\ndata: ${JSON.stringify({ kind: 'tier_limit_reached', tier: 'guest', message: signupMessage, used_cents: 0, limit_cents: 0, reason: 'anon_signup_required' })}\n\n` +
        `event: error\ndata: ${JSON.stringify({ kind: 'error', message: signupMessage })}\n\n`;
      return new Response(sseBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }
  }

  let initialHistory: Anthropic.MessageParam[] = history as Anthropic.MessageParam[];
  if (initialHistory.length === 0) {
    try {
      const persisted = await loadChatHistory(peekId);
      // tool_result rows are persisted with role='tool_result' for analytics
      // (B11-redux); the Anthropic API expects them as user-turn content
      // blocks immediately after the assistant tool_use. Re-shape on load.
      const reshaped: Anthropic.MessageParam[] = persisted
        .filter((row) =>
          row.role === 'user' ||
          row.role === 'assistant' ||
          row.role === 'tool_result',
        )
        .map((row) => ({
          role: row.role === 'tool_result' ? 'user' : row.role,
          content: stripAttachmentGuidanceFromContent(
            row.content as Anthropic.MessageParam['content'],
          ),
        }));
      // C01 from BUGS-CHAT-LOOP: drop a trailing dangling user row. A turn
      // that aborted mid-stream persisted the user message but never landed
      // an assistant message; replaying it would put two consecutive
      // user-role messages back-to-back and Anthropic 400s.
      while (reshaped.length > 0 && reshaped[reshaped.length - 1]?.role === 'user') {
        reshaped.pop();
      }
      initialHistory = reshaped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('loadChatHistory failed', { peekId, message });
    }
  }

  const userInput: string | Anthropic.ContentBlockParam[] =
    typeof userMessage === 'string'
      ? userMessage
      : (userMessage as Anthropic.ContentBlockParam[]);
  const baseUserContent: Anthropic.ContentBlockParam[] =
    typeof userInput === 'string'
      ? userInput.trim().length > 0
        ? [{ type: 'text', text: userInput }]
        : []
      : userInput;

  const userContent: Anthropic.ContentBlockParam[] = [...baseUserContent];
  if (attachments && attachments.length > 0) {
    const bullets = attachments
      .map((a, i) => {
        const label = a.alt?.trim() ? ` — ${a.alt.trim()}` : '';
        return `${i + 1}. ${a.url}${label}`;
      })
      .join('\n');
    const guidance =
      `[system] The curator just attached ${attachments.length} image${attachments.length === 1 ? '' : 's'}:\n` +
      `${bullets}\n` +
      `These are stable public Supabase Storage URLs. When you call set_hero_image, add_card, generate_hero_image, or any tool that takes an image_url, pass one of these exact URLs (use source: "user_upload" for set_hero_image). Do not invent or paraphrase URLs.`;
    const imageBlocks: Anthropic.ContentBlockParam[] = attachments.map((a) => ({
      type: 'image',
      source: { type: 'url', url: a.url },
    }));
    userContent.unshift({ type: 'text', text: guidance }, ...imageBlocks);
  }

  // Files API: drain peeks.metadata.active_attached_file_ids[] into the next
  // user-turn content. The attach_files_api_ref tool records intent; we
  // inject ONCE per attach call. Audio falls back to a text mention (the
  // current Anthropic Files API doesn't accept audio refs in content blocks).
  try {
    const [row] = await db
      .select({ metadata: peeks.metadata })
      .from(peeks)
      .where(eq(peeks.id, peekId));
    const meta = (row?.metadata as Record<string, unknown> | undefined) ?? {};
    const active = Array.isArray(meta['active_attached_file_ids'])
      ? (meta['active_attached_file_ids'] as string[])
      : [];
    const uploaded = Array.isArray(meta['uploaded_files'])
      ? (meta['uploaded_files'] as Array<{
          file_id?: string;
          mime?: string;
          original_name?: string;
        }>)
      : [];
    if (active.length > 0) {
      const fileBlocks: Anthropic.ContentBlockParam[] = active.flatMap((fid) => {
        const entry = uploaded.find((u) => u.file_id === fid);
        if (!entry) return [];
        // Files API file_id sources are part of the Beta surface; the
        // chat client carries the `anthropic-beta: files-api-2025-04-14`
        // header globally (see lib/anthropic/client.ts) so the API
        // accepts these refs. The non-beta TS union doesn't include
        // file_id sources, so cast through unknown.
        if (entry.mime?.startsWith('image/')) {
          return [
            {
              type: 'image',
              source: { type: 'file', file_id: fid },
            } as unknown as Anthropic.ContentBlockParam,
          ];
        }
        if (entry.mime === 'application/pdf') {
          return [
            {
              type: 'document',
              source: { type: 'file', file_id: fid },
            } as unknown as Anthropic.ContentBlockParam,
          ];
        }
        return [
          {
            type: 'text',
            text: `[audio file attached: ${entry.original_name ?? '(unnamed)'} (file_id: ${fid})]`,
          },
        ];
      });
      if (fileBlocks.length > 0) {
        userContent.unshift(...fileBlocks);
      }
      await db
        .update(peeks)
        .set({
          metadata: { ...meta, active_attached_file_ids: [] },
          updatedAt: new Date(),
        })
        .where(eq(peeks.id, peekId));
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    log.warn('attached_file_injection_failed', { peekId, message: m });
  }

  if (userContent.length === 0) {
    return Response.json({ error: 'empty_message' }, { status: 400 });
  }

  const chosenModel = model ?? DEFAULT_MODEL;

  const moderationText = baseUserContent
    .filter((b): b is Anthropic.TextBlockParam => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const [throttle, moderation] = await Promise.all([
    checkAllowed({
      userId,
      sessionId,
      vendor: 'anthropic',
      kind: chosenModel,
    }),
    moderationText.length > 0
      ? moderateInput({
          text: moderationText,
          field: 'chat_message',
          peekId,
          userId,
          sessionId,
        })
      : Promise.resolve<ModerationResult>({ allow: true }),
  ]);

  if (!moderation.allow) {
    log.info('moderation_block_chat', {
      peekId,
      sessionId,
      reason: moderation.reason,
    });
    const blockSse =
      `event: error\ndata: ${JSON.stringify({ kind: 'error', message: moderation.user_message, error_kind: 'moderation_block', user_message: moderation.user_message })}\n\n`;
    return new Response(blockSse, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }
  if (!throttle.allow) {
    log.warn('tier_limit_reached', {
      tier: throttle.tier,
      used_cents: throttle.used_cents,
      limit_cents: throttle.limit_cents,
      userId,
      sessionId,
    });
    const message =
      throttle.reason ??
      "Daily compute limit reached. Try again tomorrow or publish a peek to unlock more.";
    const body = `event: tier_limit_reached\ndata: ${JSON.stringify({ kind: 'tier_limit_reached', tier: throttle.tier, message, used_cents: throttle.used_cents, limit_cents: throttle.limit_cents, reason: 'tier_hard_cap' })}\n\nevent: error\ndata: ${JSON.stringify({ kind: 'error', message })}\n\n`;
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }
  if (throttle.warn) {
    userContent.unshift({
      type: 'text',
      text: `[system] The curator is at ${Math.round((throttle.used_cents / Math.max(throttle.limit_cents, 1)) * 100)}% of their daily compute budget (tier: ${throttle.tier}). Nudge them gently toward publishing this peek — once it's published, their limit jumps. Keep responses tighter; avoid speculative scrape/image generation unless they ask.`,
    });
  }

  if (moderation.allow && moderation.warnings && moderation.warnings.length > 0) {
    userContent.unshift({
      type: 'text',
      text: `[system] moderation_warning: ${moderation.warnings.join(', ')}. peek.gift is a gift-curation product and is not the right venue for legal, medical, or financial advice. Acknowledge briefly if relevant, then steer back to the gift.`,
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: SseEvent): void => {
        if (closed) return;
        try {
          controller.enqueue(encodeSseEvent(event));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.error('enqueue failed', { message });
        }
      };
      const safeClose = (): void => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      if (req.signal.aborted) {
        safeClose();
      } else {
        req.signal.addEventListener('abort', safeClose, { once: true });
      }

      const turnUsages: TurnUsage[] = [];
      let toolCallTotal = 0;
      const pendingToolNames = new Map<string, string>();
      const turnStartedAt = Date.now();

      try {
        await appendChatMessage({
          peekId,
          role: 'user',
          content: userContent,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('persist user message failed', { peekId, message });
      }

      let curatorName: string | null = null;
      if (userId) {
        try {
          const u = await getCurrentUser();
          if (u) {
            const composed = [u.firstName, u.lastName]
              .filter((s): s is string => typeof s === 'string' && s.length > 0)
              .join(' ')
              .trim();
            curatorName = composed.length > 0 ? composed : null;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.warn('currentUser_failed', { message });
        }
      }
      if (!curatorName?.trim()) curatorName = 'the curator';

      let peekSummary: string | null = null;
      let occasionType: OccasionType | null = null;
      let threadPhase: ThreadPhase = 'intro';
      let cardsPhase = false;
      try {
        const snap = await loadPeekSnapshot(peekId);
        if (snap) {
          const recipient = snap.peek.recipientName?.trim();
          const occasion = snap.peek.occasion?.trim();
          const cardCount = snap.cards.length;
          if (recipient) {
            const occPart = occasion ? ` (${occasion})` : '';
            peekSummary = `gift for ${recipient}${occPart}, ${cardCount} card${cardCount === 1 ? '' : 's'} so far`;
          } else {
            peekSummary = 'new peek (no recipient yet)';
          }
          occasionType = classifyOccasionToTemplate(occasion);
          cardsPhase = cardCount > 0;
          // Coarse phase inference from peek state. A finer-grained
          // classifier can override later.
          const hasHero = !!snap.peek.heroImageUrl;
          const hasNote = !!snap.peek.noteMd?.trim();
          if (snap.peek.status === 'published' || snap.peek.status === 'claimed') {
            threadPhase = 'post-publish';
          } else if (hasHero && hasNote && cardCount >= 1) {
            threadPhase = 'pre-publish';
          } else if (cardCount >= 1) {
            threadPhase = 'assembling';
          } else if (recipient) {
            threadPhase = 'collecting';
          } else {
            threadPhase = 'intro';
          }
        } else {
          peekSummary = 'new peek (no recipient yet)';
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn('peek_summary_load_failed', { peekId, message });
      }

      let anonymousTurnsRemaining: number | null = null;
      if (!userId) {
        try {
          const used = await anonymousTurnCount(sessionId, ip);
          anonymousTurnsRemaining = Math.max(0, ANON_TURN_CAP - used);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.warn('anonymousTurnCount_failed', { sessionId, message });
        }
      }

      // Curator durable memory: load profile.md + all kv/*.json entries
      // from peek_v2.curator_memory and stringify them into the dynamic
      // system-prompt block. Signed-in only; anon curators skip entirely.
      let curatorMemory: string | null = null;
      if (userId) {
        try {
          const sb = getSupabaseService();
          const { data: rows } = await sb
            .from('curator_memory')
            .select('path, content')
            .eq('clerk_user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);
          if (rows && rows.length > 0) {
            const profilePath = `/memories/${userId}/profile.md`;
            const kvPrefix = `/memories/${userId}/kv/`;
            const profile = rows.find((r) => r.path === profilePath);
            const kv = rows.filter((r) => r.path.startsWith(kvPrefix));
            const parts: string[] = [];
            if (profile?.content) {
              parts.push(`Curator profile:\n${profile.content}`);
            }
            if (kv.length > 0) {
              const nowMs = Date.now();
              // W06 from BUGS-WAVE2: enforce expires_at on KV entries
              // (set_curator_memory writes `{value, expires_at, set_at}`).
              // Without this filter, stale entries persist forever and bleed
              // into the system prompt of every future peek.
              const kvPairs = kv
                .map((r) => {
                  try {
                    const parsed = JSON.parse(r.content ?? '') as {
                      value: unknown;
                      expires_at?: string | null;
                    };
                    if (parsed.expires_at) {
                      const expMs = Date.parse(parsed.expires_at);
                      if (Number.isFinite(expMs) && expMs <= nowMs) {
                        return null;
                      }
                    }
                    const key = r.path
                      .replace(kvPrefix, '')
                      .replace(/\.json$/, '');
                    return `- ${key}: ${JSON.stringify(parsed.value)}`;
                  } catch {
                    return null;
                  }
                })
                .filter((s): s is string => s !== null);
              if (kvPairs.length > 0) {
                parts.push(`Curator facts:\n${kvPairs.join('\n')}`);
              }
            }
            if (parts.length > 0) {
              curatorMemory = parts.join('\n\n');
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.warn('curator_memory_load_failed', { userId, message });
        }
      }

      try {
        const turn = chatTurn({
          ctx: { peekId, userId, sessionId },
          history: initialHistory,
          userMessage: userContent,
          model: chosenModel,
          systemPromptOptions: {
            curatorName,
            peekSummary,
            peekId,
            occasionType,
            threadPhase,
            cardsPhase,
            anonymousTurnsRemaining,
            curatorMemory,
          },
          signal: req.signal,
          onToolResult: async (id, _name, output) => {
            safeEnqueue({ kind: 'tool_result', id, output });
            try {
              await appendChatMessage({
                peekId,
                role: 'tool_result',
                content: output,
                toolCallId: id,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              log.error('persist tool_result failed', {
                peekId,
                id,
                message,
              });
            }
            try {
              const snapshot = await loadPeekSnapshot(peekId);
              if (snapshot) {
                safeEnqueue({
                  kind: 'peek_update',
                  snapshot: {
                    peek: snapshot.peek,
                    cards: snapshot.cards,
                    variantGroups: snapshot.variantGroups,
                  },
                });
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              log.error('peek_update snapshot failed', {
                peekId,
                id,
                message,
              });
            }
          },
        });

        while (true) {
          const next = await turn.next();
          if (next.done) {
            const finalHistory = next.value.history;
            const newAssistantTurns = finalHistory
              .slice(initialHistory.length + 1)
              .filter((m) => m.role === 'assistant');
            for (const msg of newAssistantTurns) {
              try {
                await appendChatMessage({
                  peekId,
                  role: 'assistant',
                  content: msg.content,
                });
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : String(err);
                log.error('persist assistant turn failed', { peekId, message });
              }
            }
            break;
          }
          const event = next.value;
          switch (event.type) {
            case 'text_delta': {
              safeEnqueue({ kind: 'text', delta: event.text });
              break;
            }
            case 'tool_use_start': {
              pendingToolNames.set(event.id, event.name);
              toolCallTotal += 1;
              safeEnqueue({
                kind: 'tool_call',
                id: event.id,
                name: event.name,
              });
              break;
            }
            case 'tool_use_end': {
              if (event.input !== undefined) {
                const name = pendingToolNames.get(event.id);
                if (name) {
                  safeEnqueue({
                    kind: 'tool_call',
                    id: event.id,
                    name,
                    input: event.input,
                  });
                }
              }
              break;
            }
            case 'message_end': {
              const usage = toTurnUsage(event.usage);
              turnUsages.push(usage);
              break;
            }
            case 'error': {
              const upstream = isUpstreamError(event.error);
              log.warn('stream_error', {
                peekId,
                message: event.error.message,
                upstream,
              });
              safeEnqueue({
                kind: 'error',
                message: upstream ? FRIENDLY_UPSTREAM_MSG : event.error.message,
              });
              break;
            }
            case 'thinking_delta':
            case 'tool_use_delta': {
              break;
            }
          }
        }

        const aggregated = turnUsages.reduce<TurnUsage>(
          (acc, u) => ({
            input_tokens: acc.input_tokens + u.input_tokens,
            output_tokens: acc.output_tokens + u.output_tokens,
            cache_read_input_tokens:
              (acc.cache_read_input_tokens ?? 0) +
              (u.cache_read_input_tokens ?? 0),
            cache_creation_input_tokens:
              (acc.cache_creation_input_tokens ?? 0) +
              (u.cache_creation_input_tokens ?? 0),
          }),
          { input_tokens: 0, output_tokens: 0 },
        );

        if (!req.signal.aborted) {
          safeEnqueue({ kind: 'turn_end', usage: aggregated });
        }

        await track({
          name: 'chat_turn',
          peekId,
          userId,
          sessionId,
          payload: {
            tokens_in: aggregated.input_tokens,
            tokens_out: aggregated.output_tokens,
            cache_read_input_tokens: aggregated.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens:
              aggregated.cache_creation_input_tokens ?? 0,
            tool_calls: toolCallTotal,
            iterations: turnUsages.length,
            latency_ms: Date.now() - turnStartedAt,
            model: chosenModel,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const upstream = isUpstreamError(err);
        log.error('turn failed', {
          peekId,
          sessionId,
          message,
          upstream,
        });
        safeEnqueue({
          kind: 'error',
          message: upstream ? FRIENDLY_UPSTREAM_MSG : message,
        });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
