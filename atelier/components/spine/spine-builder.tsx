'use client';

import * as React from 'react';
import { SlugRenderer } from '@/components/renderer/slug-renderer';
import { deriveSpinePage } from '@/lib/spine/derive';
import type { SpineSseEvent, SpineState } from '@/lib/spine/types';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'error';
  text: string;
};

function uid(): string {
  return Math.random().toString(36).slice(2);
}

export function SpineBuilder({ initialState }: { initialState: SpineState }) {
  const [state, setState] = React.useState<SpineState>(initialState);
  const [lines, setLines] = React.useState<ChatLine[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [published, setPublished] = React.useState<string | null>(null);
  const logRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const page = React.useMemo(() => {
    try {
      return deriveSpinePage(state);
    } catch {
      return null;
    }
  }, [state]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    const userId = uid();
    const asstId = uid();
    setLines((l) => [
      ...l,
      { id: userId, role: 'user', text: message },
      { id: asstId, role: 'assistant', text: '' },
    ]);

    try {
      const res = await fetch('/api/spine/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ peekId: state.peek.id, message }),
      });
      if (!res.body) throw new Error('no stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const json = dataLine.slice('data:'.length).trim();
          if (!json) continue;
          let ev: SpineSseEvent;
          try {
            ev = JSON.parse(json) as SpineSseEvent;
          } catch {
            continue;
          }
          if (ev.type === 'text') {
            setLines((l) =>
              l.map((m) => (m.id === asstId ? { ...m, text: m.text + ev.text } : m)),
            );
          } else if (ev.type === 'tool') {
            setLines((l) => [
              ...l,
              {
                id: uid(),
                role: 'tool',
                text: `${ev.ok ? '✓' : '✕'} ${ev.name} — ${ev.summary}`,
              },
            ]);
          } else if (ev.type === 'state') {
            setState(ev.state);
          } else if (ev.type === 'error') {
            setLines((l) => [
              ...l,
              { id: uid(), role: 'error', text: ev.message },
            ]);
          }
        }
      }
    } catch (err) {
      setLines((l) => [
        ...l,
        {
          id: uid(),
          role: 'error',
          text: err instanceof Error ? err.message : 'request failed',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/spine/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ peekId: state.peek.id }),
      });
      const out = (await res.json()) as { url?: string; error?: string };
      if (out.url) setPublished(out.url);
      else
        setLines((l) => [
          ...l,
          { id: uid(), role: 'error', text: out.error ?? 'publish failed' },
        ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.shell}>
      <div style={styles.chat}>
        <div style={styles.header}>
          <strong>spine · build</strong>
          <span style={styles.muted}>peek {state.peek.slug}</span>
        </div>
        <div ref={logRef} style={styles.log}>
          {lines.length === 0 ? (
            <p style={styles.muted}>
              Type to build. Try: “It’s for my sister Maya’s 30th — she loves
              ceramics and natural wine.”
            </p>
          ) : null}
          {lines.map((m) => (
            <div key={m.id} style={lineStyle(m.role)}>
              {m.text || (m.role === 'assistant' && busy ? '…' : '')}
            </div>
          ))}
        </div>
        <div style={styles.composer}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Tell Peek about the gift…"
            rows={2}
            style={styles.textarea}
            disabled={busy}
          />
          <div style={styles.actions}>
            <button onClick={() => void send()} disabled={busy} style={styles.button}>
              {busy ? 'working…' : 'send'}
            </button>
            <button
              onClick={() => void publish()}
              disabled={busy}
              style={{ ...styles.button, ...styles.publish }}
            >
              publish
            </button>
          </div>
          {published ? (
            <p style={styles.published}>
              published →{' '}
              <a href={published} target="_blank" rel="noreferrer">
                {published}
              </a>
            </p>
          ) : null}
        </div>
      </div>
      <div style={styles.preview}>
        {page ? (
          <SlugRenderer page={page} data-mount="preview" />
        ) : (
          <p style={styles.muted}>preview unavailable</p>
        )}
      </div>
    </div>
  );
}

function lineStyle(role: ChatLine['role']): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 10,
    maxWidth: '90%',
    whiteSpace: 'pre-wrap',
    fontSize: 14,
    lineHeight: 1.4,
  };
  if (role === 'user')
    return { ...base, alignSelf: 'flex-end', background: '#1B1A3D', color: '#fff' };
  if (role === 'tool')
    return { ...base, alignSelf: 'flex-start', background: '#eef', color: '#334', fontFamily: 'monospace', fontSize: 12 };
  if (role === 'error')
    return { ...base, alignSelf: 'flex-start', background: '#fee', color: '#900' };
  return { ...base, alignSelf: 'flex-start', background: '#f4ecdb', color: '#1B1A3D' };
}

const styles = {
  shell: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 420px) 1fr',
    height: '100dvh',
    width: '100%',
  },
  chat: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ddd',
    minHeight: 0,
    background: '#fafafa',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
  },
  log: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
  },
  composer: { borderTop: '1px solid #eee', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  textarea: {
    width: '100%',
    resize: 'none',
    padding: 10,
    borderRadius: 10,
    border: '1px solid #ccc',
    fontFamily: 'inherit',
    fontSize: 14,
  },
  actions: { display: 'flex', gap: 8 },
  button: {
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid #1B1A3D',
    background: '#1B1A3D',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  publish: { background: '#E8A93C', borderColor: '#E8A93C', color: '#1B1A3D' },
  published: { fontSize: 13, margin: 0 },
  muted: { color: '#888', fontSize: 13 },
  preview: { overflowY: 'auto', minHeight: 0, background: '#fff' },
} satisfies Record<string, React.CSSProperties>;
