'use client';

import { useCallback, useRef, useState } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import PreviewPane from './PreviewPane';
import type { Attachment, ChatMessage, ContentBlock, StreamEvent } from './types';

function newId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;
      if (streaming) return;

      const userContent: ContentBlock[] = [];
      for (const att of attachments) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: att.mediaType, data: att.base64 },
        });
      }
      if (trimmed) userContent.push({ type: 'text', text: trimmed });

      const userMsg: ChatMessage = { id: newId(), role: 'user', content: userContent };
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: [{ type: 'text', text: '' }],
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/grook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let event: StreamEvent;
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }

            if (event.type === 'text') {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsg.id) return m;
                  const first = m.content[0];
                  if (!first || first.type !== 'text') return m;
                  return {
                    ...m,
                    content: [{ ...first, text: first.text + event.text }, ...m.content.slice(1)],
                  };
                })
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        pending: false,
                        content: [{ type: 'text', text: `⚠️ ${event.message}` }],
                      }
                    : m
                )
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m))
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m))
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m))
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    pending: false,
                    content: [{ type: 'text', text: `⚠️ ${err?.message ?? 'send failed'}` }],
                  }
                : m
            )
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="min-h-dvh chrome-bg flex flex-col md:flex-row">
      <section className="flex flex-col h-dvh md:h-dvh md:w-[480px] lg:w-[560px] md:border-r border-white/10">
        <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xl leading-none">✻</span>
            <span className="font-display text-lg tracking-tight">peek</span>
            <span className="text-xs text-white/40 ml-1">grook</span>
          </div>
          <div className="text-xs text-white/40">sonnet 4.5</div>
        </header>

        <MessageList messages={messages} />

        <InputBar onSend={send} streaming={streaming} onStop={stop} />
      </section>

      <section className="hidden md:flex flex-1">
        <PreviewPane />
      </section>
    </div>
  );
}
