'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Send, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  ChatMessage,
  SseEvent,
  ToolCallEvent,
} from '@/lib/peek/types';

type Props = {
  peekId: string;
  className?: string;
};

const SESSION_KEY = 'peek-anon-session';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

function humanizeToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^Set /, 'Setting ')
    .replace(/^Add /, 'Adding ')
    .replace(/^Remove /, 'Removing ')
    .replace(/^Update /, 'Updating ')
    .replace(/^Generate /, 'Generating ')
    .replace(/^Reorder /, 'Reordering ')
    .replace(/^Scrape /, 'Reading ')
    .replace(/^Mark /, 'Marking ');
}

function parseSseStream(chunk: string, buffer: string): {
  events: SseEvent[];
  buffer: string;
} {
  const combined = buffer + chunk;
  const frames = combined.split('\n\n');
  const remainder = frames.pop() ?? '';
  const events: SseEvent[] = [];
  for (const frame of frames) {
    if (!frame.trim()) continue;
    let kind: string | null = null;
    let dataLines: string[] = [];
    for (const rawLine of frame.split('\n')) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) {
        kind = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (!kind || dataLines.length === 0) continue;
    try {
      const data = JSON.parse(dataLines.join('\n')) as Omit<SseEvent, 'kind'>;
      events.push({ kind, ...data } as SseEvent);
    } catch {
      continue;
    }
  }
  return { events, buffer: remainder };
}

export function ChatPane({ peekId, className }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const history = useMemo(
    () =>
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    [messages],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
      };
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        toolCalls: [],
        streaming: true,
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setDraft('');
      setSending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peekId,
            sessionId,
            history,
            userMessage: text.trim(),
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          if (body?.error === 'signup_required') {
            router.push(`/sign-in?returnTo=/build/${peekId}`);
            return;
          }
        }

        if (!response.ok || !response.body) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const parsed = parseSseStream(chunk, buffer);
          buffer = parsed.buffer;
          for (const evt of parsed.events) {
            dispatchEvent(evt, assistantMessage.id, setMessages);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id && m.role === 'assistant'
              ? {
                  ...m,
                  streaming: false,
                  content:
                    m.content ||
                    "Something glitched mid-thought. Try that again?",
                }
              : m,
          ),
        );
      } finally {
        setSending(false);
        abortRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id && m.role === 'assistant'
              ? { ...m, streaming: false }
              : m,
          ),
        );
      }
    },
    [history, peekId, router, sending, sessionId],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void send(draft);
    },
    [draft, send],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send(draft);
      }
    },
    [draft, send],
  );

  const onFilePick = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraft(
      (prev) =>
        `${prev ? `${prev}\n` : ''}[attached image: ${file.name}] (upload coming soon)`,
    );
    e.target.value = '';
  }, []);

  const onTextareaChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    },
    [],
  );

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-border bg-background',
        className,
      )}
      aria-label="Build chat"
    >
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6"
        >
          {messages.length === 0 ? <EmptyChatHint /> : null}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
          <Textarea
            value={draft}
            onChange={onTextareaChange}
            onKeyDown={onKeyDown}
            placeholder="Tell Peek who this is for and what they love…"
            disabled={sending}
            rows={1}
            className="min-h-[44px] resize-none overflow-hidden"
            aria-label="Chat input"
          />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="text-muted-foreground"
            >
              <ImagePlus className="mr-1.5 h-4 w-4" />
              Add image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFilePick}
            />
            <Button
              type="submit"
              size="sm"
              disabled={sending || !draft.trim()}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {sending ? 'Thinking…' : 'Send'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function dispatchEvent(
  evt: SseEvent,
  assistantId: string,
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void,
): void {
  if (evt.kind === 'text') {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? { ...m, content: m.content + evt.delta }
          : m,
      ),
    );
    return;
  }
  if (evt.kind === 'tool_call') {
    const call: ToolCallEvent = {
      id: evt.id,
      name: evt.name,
      status: 'pending',
    };
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? { ...m, toolCalls: [...m.toolCalls, call] }
          : m,
      ),
    );
    return;
  }
  if (evt.kind === 'tool_result') {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? {
              ...m,
              toolCalls: m.toolCalls.map((c) =>
                c.id === evt.id ? { ...c, status: 'done' } : c,
              ),
            }
          : m,
      ),
    );
    return;
  }
  if (evt.kind === 'turn_end') {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? { ...m, streaming: false }
          : m,
      ),
    );
    return;
  }
  if (evt.kind === 'error') {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? {
              ...m,
              streaming: false,
              toolCalls: m.toolCalls.map((c) =>
                c.status === 'pending' ? { ...c, status: 'error' } : c,
              ),
              content: m.content || `Error: ${evt.message}`,
            }
          : m,
      ),
    );
  }
}

function EmptyChatHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
    >
      <Sparkles className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Start with who this Peek is for. Their name, the occasion, a thing they
        love. Peek takes it from there.
      </p>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">
          {isUser ? 'You' : 'P'}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-1.5',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {message.content || (!isUser && message.role === 'assistant' && message.streaming) ? (
          <div
            className={cn(
              'whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground',
            )}
          >
            {message.content}
            {!isUser && message.role === 'assistant' && message.streaming ? (
              <TypingCursor />
            ) : null}
          </div>
        ) : null}
        {!isUser && message.role === 'assistant' && message.toolCalls.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((call) => (
              <ToolCallPill key={call.id} call={call} />
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ToolCallPill({ call }: { call: ToolCallEvent }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground',
        call.status === 'error' && 'border-destructive text-destructive',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          call.status === 'pending' && 'animate-pulse bg-muted-foreground',
          call.status === 'done' && 'bg-emerald-500',
          call.status === 'error' && 'bg-destructive',
        )}
        aria-hidden
      />
      Peek {humanizeToolName(call.name).toLowerCase()}
    </motion.span>
  );
}

function TypingCursor() {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-3 w-1 translate-y-[1px] bg-current"
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
