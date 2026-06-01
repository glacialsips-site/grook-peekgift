'use client';

// ============================================================================
// app/studio/chat-ui.tsx — the chat surface primitives (ported from the reference
// chat-ui: chat-shared.jsx + chat-live.jsx). Tokens, the Claude glyph, the icon set,
// the continuous "ink-wash" smoke film, and the message components tuned for
// legibility over a busy live-preview backdrop (SHELL_SPEC §0: legible at ~60%
// obscured). No hard bubbles for the assistant — feathered ink wash + serif text.
// ============================================================================

import React from 'react';

// ─── Tokens (verbatim from chat-shared.jsx) ──────────────────────────────────
export const C = {
  cream: '#FAF7F2',
  surface: '#FFFFFF',
  ink: '#1F1E1D',
  muted: '#6B6862',
  faint: '#9C988F',
  border: '#E8E1D5',
  borderSoft: '#EFEAE0',
  coral: '#D97757',
  coralDeep: '#BF5A3D',
  coralWash: '#F4E4D8',
  coralTint: '#FBEFE6',
} as const;

export const UI_FONT = '-apple-system, "SF Pro Text", system-ui, sans-serif';
export const SERIF = '"Source Serif 4", "Tiempos Text", "Iowan Old Style", Georgia, serif';

// ─── Icons (the subset the studio uses) ──────────────────────────────────────
// Param types are widened to string so any call site can pass any color literal.
export const Icon = {
  mic: (size = 18, color: string = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" fill={color} />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  ),
  envelope: (size = 18, color: string = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" stroke={color} strokeWidth="1.7" />
      <path d="M4 7.5l8 5.5 8-5.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowUp: (size = 18, color: string = '#fff') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  chevDown: (size = 12, color: string = C.muted) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevUp: (size = 12, color: string = '#fff') => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 8l4-4 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  more: (size = 20, color: string = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="19" cy="12" r="1.8" fill={color} />
    </svg>
  ),
  sidebar: (size = 22, color: string = C.ink) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4.5" width="18" height="15" rx="3" stroke={color} strokeWidth="1.7" />
      <path d="M10 5v14" stroke={color} strokeWidth="1.7" />
    </svg>
  ),
} as const;

// ─── Claude star glyph (simplified sunburst — visual DNA, not the exact logo) ──
export function ClaudeMark({ size = 22, color = C.coral }: { size?: number; color?: string }) {
  const r1 = size * 0.5;
  const r2 = size * 0.16;
  return (
    <svg width={size} height={size} viewBox={`-${size / 2} -${size / 2} ${size} ${size}`}>
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x={-r2 / 2} y={-r1} width={r2} height={r1 * 2} rx={r2 / 2} fill={color} transform={`rotate(${a})`} />
      ))}
    </svg>
  );
}

// ─── The continuous smoke film behind the scroll region (chat-live.jsx) ───────
// One feathered ink wash: fades in from the top, grounds messages near the bottom
// where they meet bright preview cards. No per-message rectangles.
export function SmokeFilm() {
  const grad =
    'linear-gradient(180deg, transparent 0%, transparent 18%, rgba(14,8,5,0.30) 38%, rgba(14,8,5,0.55) 70%, rgba(14,8,5,0.62) 100%)';
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: grad }} />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          maskImage: 'linear-gradient(180deg, transparent 0%, transparent 12%, #000 38%, #000 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, transparent 12%, #000 38%, #000 100%)',
        }}
      />
    </>
  );
}

// ─── Assistant message: ink-wash, serif, shadowed for legibility (no bubble) ──
export function ClaudeMsg({ children, streaming }: { children: React.ReactNode; streaming?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 4, flexShrink: 0 }}>
        <ClaudeMark size={15} color="#fff" />
      </div>
      <div
        style={{
          flex: 1,
          color: '#fff',
          fontFamily: SERIF,
          fontSize: 16.5,
          lineHeight: 1.45,
          letterSpacing: -0.1,
          textShadow: '0 1px 1px rgba(0,0,0,0.55), 0 0 14px rgba(0,0,0,0.35)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
        {streaming && <BlinkCaret />}
      </div>
    </div>
  );
}

// ─── User message: coral liquid-glass bubble (chat-live.jsx LUserMsg) ─────────
export function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 16px' }}>
      <div
        style={{
          maxWidth: '78%',
          padding: '8px 13px',
          borderRadius: 18,
          borderBottomRightRadius: 6,
          background: 'rgba(217,119,87,0.78)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          border: '0.5px solid rgba(255,210,180,0.55)',
          boxShadow: 'inset 0 1px 0 rgba(255,235,220,0.4), 0 1px 4px rgba(120,40,20,0.18)',
          color: '#fff',
          fontFamily: UI_FONT,
          fontSize: 15,
          lineHeight: 1.4,
          textShadow: '0 1px 1px rgba(80,20,5,0.45)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── "Peek is doing X" tool chip, shown inline while a tool runs ──────────────
const TOOL_VERB: Record<string, string> = {
  set_concept: 'shaping the concept',
  set_theme: 'painting the theme',
  upsert_section: 'placing a section',
  remove_section: 'removing a section',
  reorder_sections: 'reordering sections',
  set_note: 'writing the note',
  add_card: 'adding a gift',
  update_card: 'tweaking a gift',
  add_variant_group: 'grouping a choice',
  set_card_rule: 'setting a lock',
  remove_card: 'removing a gift',
  reorder_cards: 'reordering gifts',
  generate_hero_image: 'making the hero image',
  set_hero_media: 'setting the hero',
  resolve_card: 'finding the product',
  mark_ready: 'readying to publish',
};
export function toolVerb(name: string): string {
  return TOOL_VERB[name] ?? name.replace(/_/g, ' ');
}

export function ToolChip({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '2px 16px 8px 16px', alignItems: 'center' }}>
      <div style={{ width: 15, flexShrink: 0 }} />
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 11px 4px 9px',
          borderRadius: 999,
          background: 'rgba(30,20,15,0.42)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.22)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          fontFamily: UI_FONT,
          fontSize: 12,
          color: 'rgba(255,255,255,0.92)',
          textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        }}
      >
        <Dot />
        {label}
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: '#fff',
        boxShadow: '0 0 0 3px rgba(255,255,255,0.18)',
        animation: 'peekPulse 1.1s ease-in-out infinite',
      }}
    />
  );
}

function BlinkCaret() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        marginLeft: 2,
        verticalAlign: '-0.15em',
        background: 'currentColor',
        borderRadius: 1,
        animation: 'peekBlink 1s steps(2, start) infinite',
      }}
    />
  );
}
