'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PeekPreview from './PeekPreview';
import type { Card, Peek, VariantGroup } from '@/lib/types';

interface Bubble {
  id: string;
  who: 'me' | 'peek' | 'tool';
  text?: string;
  image_url?: string;
  tool_name?: string;
  tool_label?: string;
  pending?: boolean;
}

interface Props {
  initialPeekId: string | null;
}

const FIRST_GREETING = `hey — i'm peek. who are we building this for?\n\nname, what they are to you (girlfriend, dad, best friend...), and what the occasion is. you can be loose about it.`;

export default function ChatBuilder({ initialPeekId }: Props) {
  const router = useRouter();
  const [peekId, setPeekId] = useState<string | null>(initialPeekId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { id: 'greet', who: 'peek', text: FIRST_GREETING }
  ]);
  const [input, setInput] = useState('');
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{ peek: Peek | null; cards: Card[]; variant_groups: VariantGroup[] }>({
    peek: null,
    cards: [],
    variant_groups: []
  });
  const [previewOpenMobile, setPreviewOpenMobile] = useState(false);
  const [readyToPublish, setReadyToPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new bubble
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, sending]);

  const refetchPreview = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/peek/${id}`);
      if (r.ok) {
        const data = await r.json();
        setPreview({ peek: data.peek, cards: data.cards, variant_groups: data.variant_groups });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (peekId) refetchPreview(peekId);
  }, [peekId, refetchPreview]);

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await r.json();
      if (data.ok) setPendingImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text && !pendingImageUrl) return;
    if (sending) return;

    const userBubbleId = `u${Date.now()}`;
    setBubbles((prev) => [
      ...prev,
      { id: userBubbleId, who: 'me', text: text || undefined, image_url: pendingImageUrl || undefined }
    ]);
    setInput('');
    const imgToSend = pendingImageUrl;
    setPendingImageUrl(null);
    setSending(true);

    // Insert a pending peek bubble
    const peekBubbleId = `p${Date.now()}`;
    setBubbles((prev) => [...prev, { id: peekBubbleId, who: 'peek', text: '', pending: true }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peek_id: peekId,
          session_id: sessionId,
          user_message: { text, image_url: imgToSend }
        })
      });
      if (!res.body) throw new Error('no stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = raw.split('\n');
          let event = 'message';
          let data = '';
          for (const ln of lines) {
            if (ln.startsWith('event: ')) event = ln.slice(7);
            else if (ln.startsWith('data: ')) data = ln.slice(6);
          }
          if (!data) continue;
          let payload: any;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }

          if (event === 'hello') {
            if (payload.session_id) setSessionId(payload.session_id);
            if (payload.peek_id) setPeekId(payload.peek_id);
          } else if (event === 'text') {
            accumText += payload.text;
            setBubbles((prev) =>
              prev.map((b) => (b.id === peekBubbleId ? { ...b, text: accumText, pending: false } : b))
            );
          } else if (event === 'tool_start') {
            setBubbles((prev) => [
              ...prev,
              {
                id: `t${payload.id}`,
                who: 'tool',
                tool_name: payload.name,
                tool_label: labelForTool(payload.name, payload.input),
                pending: true
              }
            ]);
          } else if (event === 'tool_end') {
            setBubbles((prev) =>
              prev.map((b) => (b.id === `t${payload.id}` ? { ...b, pending: false } : b))
            );
            if (payload.name === 'mark_ready_for_publish') setReadyToPublish(true);
            if (peekId) await refetchPreview(peekId);
            else if (payload.result?.peek_id) {
              setPeekId(payload.result.peek_id);
              await refetchPreview(payload.result.peek_id);
            }
          } else if (event === 'preview_dirty') {
            const id = peekId || payload.peek_id;
            if (id) await refetchPreview(id);
          } else if (event === 'done') {
            // Reset accumText for next assistant turn (rare in a single call but safe)
            accumText = '';
          }
        }
      }
    } catch (e: any) {
      setBubbles((prev) => [
        ...prev,
        { id: `e${Date.now()}`, who: 'peek', text: `(something broke: ${e?.message || 'unknown'})` }
      ]);
    } finally {
      setSending(false);
    }
  }

  async function onPublish() {
    if (!peekId || publishing) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peek_id: peekId })
      });
      const data = await r.json();
      if (data.ok && data.mode === 'mock' && data.slug) {
        router.push(`/g/${data.slug}`);
      } else if (data.ok && data.mode === 'live' && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert('publish failed: ' + (data.error || 'unknown'));
      }
    } finally {
      setPublishing(false);
    }
  }

  // Paste support: image paste anywhere on the page
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            pickImage(file);
            e.preventDefault();
            return;
          }
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  return (
    <div className="min-h-dvh chrome-bg flex flex-col lg:flex-row">
      {/* PREVIEW PANE — left on desktop, modal on mobile */}
      <div
        className={`lg:flex-1 lg:order-1 lg:block ${
          previewOpenMobile ? 'fixed inset-0 z-30 bg-[var(--chrome-bg)] lg:relative' : 'hidden lg:block'
        }`}
      >
        <div className="h-dvh overflow-y-auto">
          <PeekPreview
            peek={preview.peek}
            cards={preview.cards}
            variantGroups={preview.variant_groups}
            showSourceForCurator
          />
        </div>
        {previewOpenMobile && (
          <button
            onClick={() => setPreviewOpenMobile(false)}
            className="lg:hidden fixed top-3 right-3 z-40 rounded-full bg-black/80 text-white px-3 py-2 text-sm"
          >
            close preview
          </button>
        )}
      </div>

      {/* CHAT — right on desktop, full screen on mobile */}
      <div className="flex flex-col lg:w-[440px] lg:order-2 lg:border-l chrome-line h-dvh">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b chrome-line">
          <div className="font-display text-lg">
            peek<span className="text-[var(--peek-accent)]">.</span>gift
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewOpenMobile(true)}
              className="lg:hidden rounded-full bg-white/10 text-white px-3 py-1.5 text-xs"
            >
              preview ({preview.cards.length})
            </button>
            {readyToPublish && (
              <button
                onClick={onPublish}
                disabled={publishing}
                className="rounded-full bg-[var(--peek-accent)] text-black px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                {publishing ? 'publishing…' : 'publish'}
              </button>
            )}
          </div>
        </div>

        {/* scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-chat px-3 py-4 space-y-2">
          {bubbles.map((b) => (
            <ChatBubble key={b.id} bubble={b} />
          ))}
          {sending && bubbles[bubbles.length - 1]?.pending && <Typing />}
        </div>

        {/* composer */}
        <div className="border-t chrome-line p-3">
          {pendingImageUrl && (
            <div className="mb-2 flex items-center gap-2">
              <img src={pendingImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <button onClick={() => setPendingImageUrl(null)} className="text-xs text-[var(--chrome-mute)]">
                remove
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl"
              aria-label="attach"
            >
              {uploading ? '…' : '+'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
                e.target.value = '';
              }}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="say anything…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="flex-1 resize-none bg-white/5 text-white rounded-2xl px-4 py-2.5 outline-none placeholder:text-white/40 max-h-32"
            />
            <button
              onClick={onSend}
              disabled={sending || (!input.trim() && !pendingImageUrl)}
              className="shrink-0 w-10 h-10 rounded-full bg-[var(--peek-accent)] text-black flex items-center justify-center text-xl disabled:opacity-40"
              aria-label="send"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ bubble }: { bubble: Bubble }) {
  if (bubble.who === 'tool') {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--chrome-mute)] px-2 py-1 chat-msg-enter">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--peek-accent)]" />
        {bubble.pending ? `peek is ${bubble.tool_label || 'working'}…` : `${bubble.tool_label || 'done'}`}
      </div>
    );
  }
  const mine = bubble.who === 'me';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} chat-msg-enter`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
          mine ? 'bg-[var(--peek-accent)] text-black rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'
        }`}
      >
        {bubble.image_url && (
          <img src={bubble.image_url} alt="" className="rounded-xl mb-1.5 max-h-56 w-auto" />
        )}
        {bubble.text && <div className="whitespace-pre-wrap">{bubble.text}</div>}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start chat-msg-enter">
      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:120ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function labelForTool(name: string, input: any): string {
  switch (name) {
    case 'set_recipient':
      return `noting ${input?.recipient_name || 'who'}`;
    case 'set_vibe':
      return `setting the vibe`;
    case 'set_hero_image':
      return `placing the hero`;
    case 'generate_hero_image':
      return `painting the hero${input?.prompt ? ` — ${String(input.prompt).slice(0, 38)}…` : ''}`;
    case 'set_note':
      return `writing your note in`;
    case 'add_card':
      return `adding "${input?.title || 'a card'}"`;
    case 'add_variant_group':
      return `bundling variants`;
    case 'remove_card':
      return `removing a card`;
    case 'reorder_cards':
      return `reordering`;
    case 'scrape_url':
      return `peeking at that link`;
    case 'mark_ready_for_publish':
      return `marking ready`;
    default:
      return name;
  }
}
