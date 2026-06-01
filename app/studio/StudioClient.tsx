'use client';

// ============================================================================
// app/studio/StudioClient.tsx — the STUDIO: chat over a live, building preview.
// ----------------------------------------------------------------------------
// The PeekRenderer (surface:'builder') is the full-bleed backdrop of an iOS device
// frame; the chat is docked over the bottom in liquid glass. On submit we POST the
// running conversation + current IR to /api/peek-studio and read the SSE stream
// (sse-client.ts): text deltas grow the live assistant bubble; each {page,ir}
// snapshot calls renderer.update(ir) so the page rebuilds live; {tool result} pulses
// markPlaced on the just-placed card/section; {notice} shows a banner; {done}
// finalizes. State held here: messages[] + current IR (sent back so edits compose).
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PeekIR } from '@/lib/ir/contract';
import { PeekRenderer } from '@/lib/peek-render';
import type { PeekRendererController } from '@/lib/peek-render';
import { IOSDevice } from './ios-frame';
import {
  C,
  ClaudeMark,
  ClaudeMsg,
  Icon,
  SmokeFilm,
  ToolChip,
  UI_FONT,
  UserMsg,
  toolVerb,
} from './chat-ui';
import { streamStudioTurn, type StudioEvent } from './sse-client';

// Peek's opening line — in voice (lowercase, conspiratorial, a clever friend).
// UI-only: the API seeds its own IR; we don't send this as a user/assistant turn.
const OPENER = "okay — who are we doing this for, and what's the occasion? give me the messy version.";

const DEVICE_W = 402;
const DEVICE_H = 874;

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** assistant turn still streaming (caret + tool chips render under it) */
  pending?: boolean;
}

let _seq = 0;
const nextId = () => `m${Date.now().toString(36)}_${_seq++}`;

export default function StudioClient() {
  // ── conversation + page state ───────────────────────────────────────────
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: nextId(), role: 'assistant', text: OPENER },
  ]);
  const [ir, setIr] = useState<PeekIR | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notice, setNotice] = useState<{ level: 'info' | 'warn'; text: string } | null>(null);
  const [toolLabel, setToolLabel] = useState<string | null>(null);

  // ── refs: renderer controller (for markPlaced), latest rev, scroll, abort ─
  const controllerRef = useRef<PeekRendererController | null>(null);
  const lastRevRef = useRef<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const irRef = useRef<PeekIR | null>(null);
  irRef.current = ir;

  // pulse a freshly-placed card/section once it exists in the rendered DOM
  const pulse = useCallback((id: string) => {
    // defer one frame so PeekRenderer.update() has painted the node
    requestAnimationFrame(() => {
      requestAnimationFrame(() => controllerRef.current?.markPlaced(id));
    });
  }, []);

  // auto-scroll the transcript to the newest line as it grows / streams
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, toolLabel, expanded]);

  // abort any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // mutate the trailing (pending) assistant message
  const appendDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      const out = prev.slice();
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].role === 'assistant' && out[i].pending) {
          out[i] = { ...out[i], text: out[i].text + delta };
          break;
        }
      }
      return out;
    });
  }, []);

  const finalizeAssistant = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => (m.pending ? { ...m, pending: false } : m)),
    );
  }, []);

  // ── the SSE event handler ────────────────────────────────────────────────
  const handleEvent = useCallback(
    (e: StudioEvent) => {
      switch (e.type) {
        case 'text':
          appendDelta(e.delta);
          break;
        case 'page':
          // ignore stale snapshots (rev must strictly increase)
          if (e.rev <= lastRevRef.current) break;
          lastRevRef.current = e.rev;
          setIr(e.ir);
          break;
        case 'tool':
          if (e.phase === 'start') {
            setToolLabel(toolVerb(e.name));
          } else if (e.phase === 'result') {
            setToolLabel(null);
            // pulse the just-placed node (add_card → card_id, upsert_section → id)
            const r = e.result as { card_id?: string; id?: string } | undefined;
            const placedId = r?.card_id ?? r?.id;
            if (placedId && (e.name === 'add_card' || e.name === 'upsert_section')) {
              pulse(placedId);
            }
          } else {
            setToolLabel(null);
          }
          break;
        case 'notice':
          setNotice({ level: e.level, text: e.text });
          break;
        case 'done':
          setToolLabel(null);
          finalizeAssistant();
          setStreaming(false);
          break;
        case 'error':
          setToolLabel(null);
          setNotice({ level: 'warn', text: e.error });
          // surface the error in the live bubble if it's still empty
          setMessages((prev) => {
            const out = prev.slice();
            const last = out[out.length - 1];
            if (last && last.role === 'assistant' && last.pending && !last.text) {
              out[out.length - 1] = {
                ...last,
                pending: false,
                text: 'hit a snag on that one — try me again?',
              };
            } else {
              return prev.map((m) => (m.pending ? { ...m, pending: false } : m));
            }
            return out;
          });
          setStreaming(false);
          break;
      }
    },
    [appendDelta, finalizeAssistant, pulse],
  );

  // ── submit a turn ──────────────────────────────────────────────────────────
  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;

      setExpanded(true);
      setNotice(null);
      lastRevRef.current = -1; // the route emits a fresh rev sequence per turn

      // build the API conversation from prior real turns + this one (drop the
      // synthetic opener; the engine seeds + drives its own first IR).
      const priorTurns = messages
        .filter((m, i) => !(i === 0 && m.role === 'assistant' && m.text === OPENER))
        .map((m) => ({ role: m.role, content: m.text }));
      const apiMessages = [...priorTurns, { role: 'user' as const, content: text }];

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text },
        { id: nextId(), role: 'assistant', text: '', pending: true },
      ]);
      setInput('');
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;
      void streamStudioTurn(
        { messages: apiMessages, ir: irRef.current },
        {
          onEvent: handleEvent,
          onError: (err) => {
            handleEvent({ type: 'error', error: err.message || 'stream failed' });
          },
        },
        ac.signal,
      );
    },
    [messages, streaming, handleEvent],
  );

  // recent bubbles only when collapsed-ish; full transcript when expanded
  const visibleMessages = useMemo(() => messages, [messages]);

  return (
    <div style={shellStyle}>
      <DeviceStage>
        {/* backdrop = the live, building gift page (builder surface) */}
        {ir ? (
          <PeekRenderer
            ir={ir}
            surface="builder"
            controllerRef={controllerRef}
            style={{ position: 'absolute', inset: 0 }}
          />
        ) : (
          <PreBuildBackdrop />
        )}

        {/* chat docked over the bottom */}
        <ChatDock
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          messages={visibleMessages}
          toolLabel={toolLabel}
          notice={notice}
          onDismissNotice={() => setNotice(null)}
          scrollRef={scrollRef}
          input={input}
          setInput={setInput}
          onSend={() => send(input)}
          streaming={streaming}
        />
      </DeviceStage>
    </div>
  );
}

// ── outer page chrome (centers + scales the device to the viewport) ──────────
const shellStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(120% 120% at 50% 0%, #211b24 0%, #15121a 55%, #0c0a10 100%)',
  overflow: 'hidden',
};

/** Scales the fixed-size device frame to fit whatever viewport we're in. */
function DeviceStage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const padW = 24;
      const padH = 24;
      const s = Math.min(
        (window.innerWidth - padW) / DEVICE_W,
        (window.innerHeight - padH) / DEVICE_H,
        1,
      );
      setScale(s > 0 ? s : 1);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      {/* The preview + chat are passed as children (the device's z-1 layer); the
          preview is absolute-filled first, the chat docks over it. We don't use the
          `backdrop` slot so both share one stacking context inside the frame. */}
      <IOSDevice dark width={DEVICE_W} height={DEVICE_H}>
        {children}
      </IOSDevice>
    </div>
  );
}

// ── the pre-build backdrop (before the first {page} lands) ───────────────────
function PreBuildBackdrop() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(120% 90% at 80% 0%, #2a2230 0%, #1b1720 52%, #141019 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -90,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,87,0.32) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '34%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '0 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ opacity: 0.9 }}>
          <ClaudeMark size={34} color="rgba(255,255,255,0.92)" />
        </div>
        <div
          style={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: 22,
            lineHeight: 1.35,
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          a blank page, for now.
        </div>
        <div
          style={{
            fontFamily: UI_FONT,
            fontSize: 14,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 260,
          }}
        >
          tell Peek who it&apos;s for. the page builds itself here as you talk.
        </div>
      </div>
    </div>
  );
}

// ── the docked chat ──────────────────────────────────────────────────────────
interface ChatDockProps {
  expanded: boolean;
  onToggle: () => void;
  messages: UiMessage[];
  toolLabel: string | null;
  notice: { level: 'info' | 'warn'; text: string } | null;
  onDismissNotice: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
}

function ChatDock(props: ChatDockProps) {
  const {
    expanded,
    onToggle,
    messages,
    toolLabel,
    notice,
    onDismissNotice,
    scrollRef,
    input,
    setInput,
    onSend,
    streaming,
  } = props;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
      {/* glass header */}
      <Header expanded={expanded} onToggle={onToggle} />

      {/* spacer so the preview shows through the middle */}
      <div style={{ flex: 1, minHeight: 0 }} />

      {/* notice banner (stub-mode / safeword / errors) */}
      {notice && <NoticeBanner notice={notice} onDismiss={onDismissNotice} />}

      {/* the message stream + input, OR a collapsed dock pill */}
      {expanded ? (
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          {/* scroll region with continuous smoke film for legibility */}
          <div style={{ position: 'relative', maxHeight: 420 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <SmokeFilm />
            </div>
            <div
              ref={scrollRef}
              className="peek-studio-scroll"
              style={{
                position: 'relative',
                maxHeight: 420,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
                paddingTop: 28,
                paddingBottom: 4,
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.15) 26px, rgba(0,0,0,0.6) 72px, #000 120px)',
                maskImage:
                  'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.15) 26px, rgba(0,0,0,0.6) 72px, #000 120px)',
              }}
            >
              {messages.map((m) =>
                m.role === 'assistant' ? (
                  <ClaudeMsg key={m.id} streaming={m.pending && !toolLabel}>
                    {m.text}
                  </ClaudeMsg>
                ) : (
                  <UserMsg key={m.id}>{m.text}</UserMsg>
                ),
              )}
              {toolLabel && <ToolChip label={`Peek is ${toolLabel}`} />}
            </div>
          </div>

          <InputPill input={input} setInput={setInput} onSend={onSend} streaming={streaming} />
        </div>
      ) : (
        <DockPill onTap={onToggle} />
      )}
    </div>
  );
}

function Header({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        padding: '56px 14px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 5,
        pointerEvents: 'auto',
        background: 'linear-gradient(180deg, rgba(20,14,18,0.42) 0%, rgba(20,14,18,0.0) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <button style={hdrBtn} aria-label="menu">
        {Icon.sidebar(20, '#fff')}
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(30,20,15,0.42)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
          fontFamily: UI_FONT,
          fontSize: 12.5,
          fontWeight: 600,
          color: '#fff',
          textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        }}
      >
        <ClaudeMark size={12} color="#fff" />
        peek
      </div>
      <button style={hdrBtn} aria-label={expanded ? 'collapse chat' : 'expand chat'} onClick={onToggle}>
        {expanded ? Icon.chevDown(16, '#fff') : Icon.chevUp(16, '#fff')}
      </button>
    </div>
  );
}

const hdrBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  padding: 0,
  cursor: 'pointer',
  background: 'rgba(30,20,15,0.38)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function InputPill({
  input,
  setInput,
  onSend,
  streaming,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
}) {
  return (
    <div style={{ padding: '6px 12px calc(8px + 22px)', position: 'relative', zIndex: 4, pointerEvents: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 6px 6px 16px',
          borderRadius: 999,
          background: 'rgba(255,250,245,0.26)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(40,20,10,0.18)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="tell Peek what to change…"
          enterKeyHint="send"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: UI_FONT,
            fontSize: 15.5,
            color: '#fff',
            padding: '4px 0',
            // placeholder color via the shared <style> (peekStudioCss)
          }}
          className="peek-studio-input"
        />
        <button
          onClick={onSend}
          disabled={streaming || !input.trim()}
          aria-label="send"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            padding: 0,
            border: 'none',
            cursor: streaming || !input.trim() ? 'default' : 'pointer',
            opacity: streaming || !input.trim() ? 0.55 : 1,
            background: 'rgba(255,255,255,0.92)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity .15s ease',
          }}
        >
          {Icon.arrowUp(14, C.coralDeep)}
        </button>
      </div>
    </div>
  );
}

function DockPill({ onTap }: { onTap: () => void }) {
  return (
    <div style={{ padding: '8px 14px 22px', position: 'relative', zIndex: 4, pointerEvents: 'auto' }}>
      <button
        onClick={onTap}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 8px 10px 16px',
          borderRadius: 999,
          cursor: 'pointer',
          background: 'rgba(255,250,245,0.26)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.5)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px rgba(40,20,10,0.28)',
          textAlign: 'left',
        }}
      >
        <ClaudeMark size={16} color="#fff" />
        <span
          style={{
            flex: 1,
            fontFamily: UI_FONT,
            fontSize: 15,
            color: 'rgba(255,255,255,0.88)',
            textShadow: '0 1px 1px rgba(0,0,0,0.18)',
          }}
        >
          ask Peek to refine…
        </span>
        {Icon.chevUp(14, '#fff')}
      </button>
    </div>
  );
}

function NoticeBanner({
  notice,
  onDismiss,
}: {
  notice: { level: 'info' | 'warn'; text: string };
  onDismiss: () => void;
}) {
  const warn = notice.level === 'warn';
  return (
    <div style={{ padding: '0 12px 6px', position: 'relative', zIndex: 6, pointerEvents: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '8px 10px 8px 12px',
          borderRadius: 14,
          background: warn ? 'rgba(120,40,30,0.5)' : 'rgba(30,28,40,0.5)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          border: `0.5px solid ${warn ? 'rgba(255,170,150,0.45)' : 'rgba(255,255,255,0.25)'}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 6px 18px rgba(0,0,0,0.25)',
        }}
      >
        <span
          style={{
            flex: 1,
            fontFamily: UI_FONT,
            fontSize: 12,
            lineHeight: 1.4,
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 1px rgba(0,0,0,0.4)',
          }}
        >
          {notice.text}
        </span>
        <button
          onClick={onDismiss}
          aria-label="dismiss"
          style={{
            flexShrink: 0,
            width: 18,
            height: 18,
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            fontSize: 12,
            lineHeight: '18px',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
