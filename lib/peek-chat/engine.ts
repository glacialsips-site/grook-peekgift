// ============================================================================
// peek.gift — THE PEEK CHAT BRAIN, streaming engine
// ----------------------------------------------------------------------------
// The manual STREAMING tool loop that authors a PeekIR live. Two entry points,
// one event protocol (ir/INTERFACES.md §2):
//
//   runLive(...)  — uses ports.llm (the real Opus 4.8 adapter when ANTHROPIC_API_KEY
//                   is set): streams text deltas; on each tool_use runs reduceTool,
//                   emits a `page` (full validated IR snapshot), brackets the tool
//                   with tool start/result; loops to end_turn.
//   runStub(...)  — DETERMINISTIC author with NO key: scripts tool calls through the
//                   SAME reduceTool, so the preview builds a real demo IR identically.
//
//   SAFEWORD — if a user message === (process.env.PEEK_SAFEWORD ?? "bananahead"),
//   drop persona and emit a structured self-report as notice events, then done.
//   Resume in character on "resume". The literal safeword is NEVER in the prompt.
//
// The engine emits ChatEvents to a sink; the route (app/api/peek-studio/route.ts)
// wraps the SSE transport and persistence around it.
// ============================================================================

import type { LLMMessage } from '@/lib/ir/ports';
import { ports } from '@/lib/ir/ports';
import type { PeekIR } from '@/lib/ir/contract';
import { validatePeekIR } from '@/lib/ir/schema';

import { PEEK_STUDIO_SYSTEM_PROMPT } from './system-prompt';
import { PEEK_STUDIO_TOOLS, reduceTool, type ToolContext } from './tools';

// ─────────────────────────────────────────────────────────────────────────────
// Chat SSE event union (ir/INTERFACES.md §2). The route serializes each as one
// `data:` JSON object.
// ─────────────────────────────────────────────────────────────────────────────
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'page'; ir: PeekIR; rev: number }
  | {
      type: 'tool';
      phase: 'start' | 'result' | 'error';
      id: string;
      name: string;
      input?: unknown;
      result?: unknown;
      error?: string;
    }
  | { type: 'notice'; level: 'info' | 'warn'; text: string }
  | { type: 'done'; rev: number }
  | { type: 'error'; error: string; retryable?: boolean };

export type Emit = (e: ChatEvent) => void;

// A simple chat message the route passes in (role + plain text or content blocks).
export interface StudioMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

export const SAFEWORD = process.env.PEEK_SAFEWORD ?? 'bananahead';
export const RESUME_WORD = 'resume';

// ─────────────────────────────────────────────────────────────────────────────
// Seed IR — a minimal, VALID PeekIR the chat starts from. Concept/theme carry
// neutral placeholders the model overwrites immediately via set_concept/set_theme;
// they exist only so the very first snapshot validates. Renderer shows the themed
// placeholder until real content lands.
// ─────────────────────────────────────────────────────────────────────────────
export function createSeedIR(opts: { peekId: string; curatorId: string }): PeekIR {
  const now = new Date(0).toISOString(); // fixed epoch → deterministic seed (no per-call clock in the IR)
  const ir: PeekIR = {
    schema_version: 1,
    peek: {
      id: opts.peekId,
      slug: opts.peekId,
      curator_id: opts.curatorId,
      page_type: 'gift',
      recipient_name: null,
      relationship: null,
      occasion: null,
      concept: {
        oneLiner: 'an unstarted page — the curator just walked in',
        boldMove: 'to be decided with the curator',
        voice: 'warm, conspiratorial',
        emotionalCore: 'doing something genuinely thoughtful for one specific person',
      },
      theme: {
        type: {
          display: { family: 'Fraunces', source: 'google', axis: 'Fraunces:opsz,wght@9..144,400..700' },
          body: { family: 'Inter', source: 'google' },
          scaleRatio: 1.4,
        },
        palette: {
          mode: 'light',
          bg: '#F4F1EA',
          surface: '#FFFFFF',
          ink: '#2A2622',
          muted: '#6B6358',
          line: '#E5DFD3',
          accent: '#C2683F',
        },
        scene: 'none',
        motifs: [],
        frame: 'plain',
        radius: { card: 12, pill: 999 },
        space: { sectionY: 64, gutter: 22, stack: 12 },
        motion: { intensity: 0.4, reduceMotionOK: true },
      },
      hero: null,
      note_md: null,
      cta_label: null,
      status: 'draft',
      stripe_payment_intent_id: null,
      stripe_checkout_session_id: null,
      published_at: null,
      expires_at: null,
      share_url: null,
      created_at: now,
      updated_at: now,
    },
    sections: [],
    variant_groups: [],
    cards: [],
  };
  // Trust-but-verify: ensure the seed is canonical (defaults filled).
  const v = validatePeekIR(ir);
  return v.ok ? v.value : ir;
}

// Pull the latest user message text (for safeword detection).
function lastUserText(messages: StudioMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content.trim();
    if (Array.isArray(m.content)) {
      const text = m.content
        .map((b) => (b && typeof b === 'object' && (b as { type?: string }).type === 'text' ? (b as { text?: string }).text ?? '' : ''))
        .join(' ')
        .trim();
      if (text) return text;
    }
  }
  return '';
}

// Normalize StudioMessage[] → LLMMessage[] (the port's shape).
function toLLMMessages(messages: StudioMessage[]): LLMMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : m.content,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFEWORD self-report — drop persona, report straight to the founder.
// ─────────────────────────────────────────────────────────────────────────────
function emitSafewordReport(ir: PeekIR, emit: Emit, rev: number): void {
  const c = ir.peek.concept;
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const lines: string[] = [
    'safeword received — dropping persona. founder handshake. (say "resume" to go back in character.)',
    `inferred brief: page_type=${ir.peek.page_type}, recipient=${ir.peek.recipient_name ?? '—'}, occasion=${ir.peek.occasion ?? '—'}.`,
    `concept + why: "${c.oneLiner}" · bold move = "${c.boldMove}" · voice = "${c.voice}" · emotional core = "${c.emotionalCore}"${c.antiPattern ? ` · refusing = "${c.antiPattern}"` : ''}.`,
    `state so far: ${ir.sections.length} section(s), ${ir.cards.length} card(s), ${ir.variant_groups.length} variant group(s); hero=${ir.peek.hero ? ir.peek.hero.source : 'none'}.`,
    `pantry gaps: ${hasKey ? 'real LLM wired' : 'NO ANTHROPIC_API_KEY — running the deterministic stub author, not the real brain'}. image/resolve/persistence run through ports (stub adapters unless their env keys are set).`,
    `what i faked / stubbed: ${hasKey ? 'hero images + product resolution + persistence resolve to placeholder data unless those ports have real adapters' : 'the entire turn is scripted — text and tool calls are deterministic, not model-authored'}.`,
    'what fought me: a cold start with no recipient detail forces inference; the seed concept/theme are placeholders until set_concept/set_theme land.',
    'what would be gnarlier: a real image port (fal/replicate) for the hero, a live retailer/resolver cascade, and a richer custom-section signature move per concept.',
  ];
  for (const text of lines) emit({ type: 'notice', level: 'info', text });
  emit({ type: 'done', rev });
}

// ─────────────────────────────────────────────────────────────────────────────
// runLive — the streaming, tool-using loop on the real LLM port.
//   ir       : starting snapshot (route loads or seeds it)
//   messages : conversation so far (last entry is the new user message)
// Emits: text deltas, tool brackets, a `page` after each IR mutation, then done.
// ─────────────────────────────────────────────────────────────────────────────
export async function runLive(
  ir: PeekIR,
  messages: StudioMessage[],
  ctx: ToolContext,
  emit: Emit,
  opts?: { onSnapshot?: (ir: PeekIR, rev: number) => void | Promise<void> },
): Promise<{ ir: PeekIR; rev: number }> {
  let current = ir;
  let rev = 0;

  // Safeword short-circuit (checked before any model call).
  if (lastUserText(messages).toLowerCase() === SAFEWORD.toLowerCase()) {
    emitSafewordReport(current, emit, rev);
    return { ir: current, rev };
  }

  const result = await ports.llm.chat({
    system: PEEK_STUDIO_SYSTEM_PROMPT,
    messages: toLLMMessages(messages),
    tools: PEEK_STUDIO_TOOLS as unknown as { name: string; description: string; input_schema: object }[],
    onText: (delta) => emit({ type: 'text', delta }),
    onToolCall: async (name, input) => {
      const id = `tool_${rev}_${name}`;
      emit({ type: 'tool', phase: 'start', id, name, input });
      const r = await reduceTool(current, name, input, ctx);
      if (!r.ok) {
        emit({ type: 'tool', phase: 'error', id, name, error: r.error });
        // Feed the error back to the model so it can correct.
        return { ok: false, error: r.error };
      }
      current = r.ir;
      rev += 1;
      emit({ type: 'tool', phase: 'result', id, name, result: r.result });
      emit({ type: 'page', ir: current, rev });
      await opts?.onSnapshot?.(current, rev);
      return { ok: true, result: r.result };
    },
  });

  if (!result.ok) {
    emit({ type: 'error', error: result.error, retryable: result.retryable });
    return { ir: current, rev };
  }

  emit({ type: 'done', rev });
  return { ir: current, rev };
}

// ─────────────────────────────────────────────────────────────────────────────
// runStub — DETERMINISTIC author with zero keys. Scripts a real demo turn through
// the SAME reduceTool, so the preview builds a genuine, valid PeekIR. Mirrors the
// salvaged lib/peek/preview-driver.ts shape, on the frozen spine.
//
// The script is fixed (no randomness, no clock-derived branching) so the same input
// yields the same IR — snapshot-testable. It authors a complete little gift page:
// concept → theme → hero directive → note → a variant "pick one" pair → an
// aspirational taunt → a section reorder → mark intent.
// ─────────────────────────────────────────────────────────────────────────────
type StubStep =
  | { say: string }
  | { tool: string; input: Record<string, unknown> };

function stubScript(): StubStep[] {
  return [
    { say: "love it. let's not make a wishlist — let's make a page that feels like you made it." },
    {
      tool: 'set_concept',
      input: {
        oneLiner: "a coffee-obsessed friend's birthday as a slow-morning ritual kit",
        boldMove: 'the whole page is a hand-lettered cafe chalkboard menu',
        voice: 'warm, a little smug about good taste',
        emotionalCore: 'someone who knows exactly how you take it',
        antiPattern: 'a generic "happy birthday!" balloon grid',
      },
    },
    { say: ' giving it a dusk-citrus, chalkboard-menu feel.' },
    {
      tool: 'set_theme',
      input: {
        type: {
          display: { family: 'Anton', source: 'google' },
          body: { family: 'Work Sans', source: 'google' },
          scaleRatio: 1.5,
          displayCase: 'upper',
          eyebrowTracking: '0.18em',
        },
        palette: {
          mode: 'dark',
          bg: '#16140F',
          surface: '#211D16',
          ink: '#F3EFE7',
          muted: '#A89B86',
          line: '#3A332742',
          accent: '#E5944B',
          accent2: '#7FB069',
          texture: true,
        },
        scene: 'halftone',
        motifs: ['rule', 'star'],
        frame: 'ticket',
        radius: { card: 8, pill: 999 },
        space: { sectionY: 72, gutter: 22, stack: 14 },
        motion: { intensity: 0.5 },
      },
    },
    {
      tool: 'upsert_section',
      input: {
        kind: 'hero',
        data: {
          eyebrow: "today's special",
          headline: "MARA'S\nSLOW MORNING",
          dek: 'pick your pour. the rest is on me.',
        },
      },
    },
    {
      tool: 'generate_hero_image',
      input: {
        prompt:
          'a hand-lettered cafe chalkboard, warm amber chalk on near-black slate, steam curling off a ceramic pour-over, loose confident strokes, grainy halftone texture',
        aspect: '16:9',
      },
    },
    { say: ' two ways to take it — their pick.' },
    { tool: 'add_variant_group', input: { title: 'pick your pour', selection: 'pick_one' } },
    {
      tool: 'add_card',
      input: {
        type: 'product',
        title: 'hand-thrown ceramic pour-over',
        description: 'a slow-coffee ritual, one cup at a time.',
        value_cents: 6800,
        value_display: '$68',
        __useVariantGroup: true,
      },
    },
    {
      tool: 'add_card',
      input: {
        type: 'activity',
        title: 'twilight pottery class for two',
        description: 'make the next mug yourselves.',
        value_cents: 14000,
        value_display: '$140',
        __useVariantGroup: true,
      },
    },
    { say: ' and a dream pinned at the bottom as a wink.' },
    {
      tool: 'add_card',
      input: {
        type: 'aspirational',
        title: 'a week in a kyoto machiya',
        description: 'the someday trip. pinned here as a wish.',
        value_display: '—',
        is_taunt: true,
        taunt_text: 'not this year. but i see you.',
      },
    },
    {
      tool: 'set_note',
      input: {
        note_md:
          "happy birthday, mara. you've made me a hundred good mornings — here's one back, your way.",
      },
    },
    {
      tool: 'upsert_section',
      input: { kind: 'claim', title: 'your move', data: { label: 'pick one and i send it', cta: 'claim it' } },
    },
    { say: ' want it warmer, or should we add something they’d never buy themselves?' },
  ];
}

export async function runStub(
  ir: PeekIR,
  messages: StudioMessage[],
  ctx: ToolContext,
  emit: Emit,
  opts?: { onSnapshot?: (ir: PeekIR, rev: number) => void | Promise<void> },
): Promise<{ ir: PeekIR; rev: number }> {
  let current = ir;
  let rev = 0;

  emit({
    type: 'notice',
    level: 'info',
    text: '[stub-llm] no ANTHROPIC_API_KEY — Peek is scripted. The engine + reducer are live, so the preview builds a real IR.',
  });

  // Safeword works in the stub too (founder handshake without keys).
  if (lastUserText(messages).toLowerCase() === SAFEWORD.toLowerCase()) {
    emitSafewordReport(current, emit, rev);
    return { ir: current, rev };
  }

  let variantGroupId: string | undefined;

  for (const step of stubScript()) {
    if ('say' in step) {
      // Emit as one text delta (deterministic; the route may re-chunk if it likes).
      emit({ type: 'text', delta: step.say });
      continue;
    }

    // Resolve the placeholder that links cards to the just-created variant group.
    const input: Record<string, unknown> = { ...step.input };
    if (input.__useVariantGroup) {
      delete input.__useVariantGroup;
      if (variantGroupId) input.variant_group_id = variantGroupId;
    }

    const id = `tool_${rev}_${step.tool}`;
    emit({ type: 'tool', phase: 'start', id, name: step.tool, input });
    const r = await reduceTool(current, step.tool, input, ctx);
    if (!r.ok) {
      emit({ type: 'tool', phase: 'error', id, name: step.tool, error: r.error });
      continue; // scripted: skip a failed step rather than abort the demo
    }
    current = r.ir;
    rev += 1;
    if (step.tool === 'add_variant_group') {
      variantGroupId = (r.result as { variant_group_id?: string })?.variant_group_id;
    }
    emit({ type: 'tool', phase: 'result', id, name: step.tool, result: r.result });
    emit({ type: 'page', ir: current, rev });
    await opts?.onSnapshot?.(current, rev);
  }

  emit({ type: 'done', rev });
  return { ir: current, rev };
}

// ─────────────────────────────────────────────────────────────────────────────
// runStudioTurn — the route's single entry point. Picks live vs stub by whether a
// real LLM is wired (ANTHROPIC_API_KEY present). Both drive the SAME protocol and
// the SAME reduceTool, so the preview builds a valid IR either way.
// ─────────────────────────────────────────────────────────────────────────────
export function isLiveLLM(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function runStudioTurn(
  ir: PeekIR,
  messages: StudioMessage[],
  ctx: ToolContext,
  emit: Emit,
  opts?: { onSnapshot?: (ir: PeekIR, rev: number) => void | Promise<void> },
): Promise<{ ir: PeekIR; rev: number }> {
  return isLiveLLM()
    ? runLive(ir, messages, ctx, emit, opts)
    : runStub(ir, messages, ctx, emit, opts);
}
