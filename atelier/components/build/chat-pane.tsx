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
import { Send, Sparkles, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  bubbleStyle,
  mutedTextStyle,
  shellStyle,
  vibeTokens,
} from '@/lib/vibe/component-styles';
import type {
  ChatMessage,
  PeekDraft,
  SseEvent,
  ToolCallEvent,
} from '@/lib/peek/types';
import { FilePicker, type UploadedImage } from './file-picker';
import { PublishCta } from './publish-cta';

export type InitialChatMessage = {
  role: 'user' | 'assistant' | 'tool_result';
  content: unknown;
  toolCallId: string | null;
  createdAt: string;
};

type Props = {
  peekId: string;
  className?: string;
  initialHistory?: InitialChatMessage[];
  onPeekSnapshot?: (snapshot: PeekDraft) => void;
  peekDraft?: PeekDraft | null;
  anonSessionId?: string | null;
};

type ImageAttachment = {
  id: string;
  url: string;
  contentType: string;
};

type ApiHistoryEntry = {
  role: 'user' | 'assistant';
  content: unknown;
};

type AssistantContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

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

function parseSseStream(
  chunk: string,
  buffer: string,
): { events: SseEvent[]; buffer: string } {
  const combined = buffer + chunk;
  const frames = combined.split('\n\n');
  const remainder = frames.pop() ?? '';
  const events: SseEvent[] = [];
  for (const frame of frames) {
    if (!frame.trim()) continue;
    let kind: string | null = null;
    const dataLines: string[] = [];
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

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  let out = '';
  for (const block of content) {
    if (block && typeof block === 'object') {
      const b = block as { type?: string; text?: string };
      if (b.type === 'text' && typeof b.text === 'string') {
        out += b.text;
      }
    }
  }
  return out;
}

function extractImages(content: unknown): ImageAttachment[] {
  if (!Array.isArray(content)) return [];
  const out: ImageAttachment[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as {
      type?: string;
      source?: { type?: string; url?: string; media_type?: string };
    };
    if (b.type === 'image' && b.source?.type === 'url' && b.source.url) {
      out.push({
        id: b.source.url,
        url: b.source.url,
        contentType: b.source.media_type ?? 'image/*',
      });
    }
  }
  return out;
}

function extractToolUses(content: unknown): ToolCallEvent[] {
  if (!Array.isArray(content)) return [];
  const out: ToolCallEvent[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as { type?: string; id?: string; name?: string };
    if (b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string') {
      out.push({ id: b.id, name: b.name, status: 'done' });
    }
  }
  return out;
}

function hydrateMessages(initial: InitialChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const row of initial) {
    if (row.role === 'tool_result') continue;
    const text = extractText(row.content);
    if (row.role === 'user') {
      const images = extractImages(row.content);
      const cleanedText = stripAttachmentGuidance(text);
      out.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: cleanedText,
        images:
          images.length > 0
            ? images.map((i) => ({ url: i.url, contentType: i.contentType }))
            : undefined,
      });
      continue;
    }
    out.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: text,
      toolCalls: extractToolUses(row.content),
      streaming: false,
    });
  }
  return out;
}

function stripAttachmentGuidance(text: string): string {
  if (!text.startsWith('[system] The curator just attached')) return text;
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) break;
    if (
      !line.startsWith('[system]') &&
      !/^\d+\.\s+https?:\/\//.test(line) &&
      !line.includes('Supabase Storage URLs')
    ) {
      break;
    }
    i += 1;
  }
  return lines.slice(i).join('\n').trim();
}

function toApiHistory(initial: InitialChatMessage[]): ApiHistoryEntry[] {
  const out: ApiHistoryEntry[] = [];
  for (const row of initial) {
    // Keep ALL rows — including tool_result. Anthropic's API requires
    // assistant tool_use blocks to be IMMEDIATELY followed by user
    // tool_result blocks. Stripping tool_result rows causes 400s like
    // "tool_use ids were found without tool_result blocks immediately
    // after" (BUGS B11 redux — Wave 1 fix was in outgoing path, not
    // here in the history-replay path).
    //
    // The `tool_result` role rows persisted in `chat_messages` are
    // re-injected as user-turn content blocks. The chat route's
    // `chatTurn` accepts the history as-is and pairs tool_use →
    // tool_result correctly.
    if (row.role === 'tool_result') {
      // tool_result rows in our DB are stored as their own row with
      // role='tool_result' for analytics. The API expects them as
      // user-role content blocks containing {type:'tool_result',...}.
      // Re-shape on the way out.
      out.push({ role: 'user', content: row.content });
      continue;
    }
    out.push({ role: row.role, content: row.content });
  }
  return out;
}

function computeGhostPlaceholders(draft: PeekDraft | null | undefined): string[] {
  if (!draft) {
    return ['What else?'];
  }
  const peek = draft.peek;
  const hasRecipient = Boolean(peek.recipientName);
  const hasOccasion = Boolean(peek.occasion);
  const hasHero = Boolean(peek.heroImageUrl);
  const cardCount = draft.cards.length;
  if (!hasRecipient) {
    return [
      'tell me who it is for',
      'drop their name or a photo of them',
      'what are they into right now?',
    ];
  }
  if (!hasOccasion) {
    return [
      "what's the occasion?",
      'birthday, anniversary, just because…',
      'any specific date or vibe?',
    ];
  }
  if (!hasHero && cardCount === 0) {
    return [
      'describe a vibe or drop a photo',
      'paste a product link',
      'an inside joke, a place, a memory?',
    ];
  }
  if (!hasHero) {
    return [
      'describe a vibe or drop a photo',
      'what should the cover feel like?',
      'an inside joke or a memory to lean on?',
    ];
  }
  if (cardCount === 0) {
    return [
      'paste a product link',
      'an experience? a roast card?',
      'drop anything — a song, a place, a meme',
    ];
  }
  if (cardCount <= 3) {
    return [
      'want more options?',
      'add a roast card or an experience?',
      'paste another product link',
      'any inside jokes to lock in?',
    ];
  }
  return [
    'what else?',
    'any taunts, jokes, or locked surprises?',
    'add a note for them?',
    'ready to publish — or keep going?',
  ];
}

export function ChatPane({
  peekId,
  className,
  initialHistory = [],
  onPeekSnapshot,
  peekDraft,
  anonSessionId,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    hydrateMessages(initialHistory),
  );
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const apiHistoryRef = useRef<ApiHistoryEntry[]>(toApiHistory(initialHistory));
  const onPeekSnapshotRef = useRef<Props['onPeekSnapshot']>(onPeekSnapshot);

  useEffect(() => {
    onPeekSnapshotRef.current = onPeekSnapshot;
  }, [onPeekSnapshot]);

  const scrollSignal = useMemo(
    () =>
      messages.reduce(
        (acc, m) =>
          acc + (typeof m.content === 'string' ? m.content.length : 0),
        messages.length,
      ),
    [messages],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (anonSessionId && anonSessionId.length > 0) {
      window.localStorage.setItem(SESSION_KEY, anonSessionId);
      setSessionId(anonSessionId);
    } else {
      setSessionId(getOrCreateSessionId());
    }
  }, [anonSessionId]);

  useEffect(() => {
    const viewport = scrollRef.current?.parentElement;
    if (!viewport) return;
    const onScroll = () => {
      const distance =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      nearBottomRef.current = distance < 80;
    };
    onScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!nearBottomRef.current) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [scrollSignal]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const addImage = useCallback((img: UploadedImage) => {
    setPendingImages((prev) => [
      ...prev,
      { id: img.path, url: img.url, contentType: img.contentType },
    ]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const send = useCallback(
    async (text: string, images: ImageAttachment[]) => {
      const trimmed = text.trim();
      if (!trimmed && images.length === 0) return;
      if (sending) return;

      const apiAttachments = images.map((img) => ({
        kind: 'image' as const,
        url: img.url,
        contentType: img.contentType,
      }));

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        images:
          images.length > 0
            ? images.map((i) => ({ url: i.url, contentType: i.contentType }))
            : undefined,
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
      setPendingImages([]);
      setSending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const apiUserMessage = trimmed;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peekId,
            sessionId,
            history: apiHistoryRef.current,
            userMessage: apiUserMessage,
            attachments: apiAttachments.length > 0 ? apiAttachments : undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const assistantContentBlocks: AssistantContentBlock[] = [];
        const toolUseIndexById = new Map<string, number>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const parsed = parseSseStream(chunk, buffer);
          buffer = parsed.buffer;
          for (const evt of parsed.events) {
            if (evt.kind === 'text') {
              const last = assistantContentBlocks[assistantContentBlocks.length - 1];
              if (last && last.type === 'text') {
                last.text += evt.delta;
              } else {
                assistantContentBlocks.push({ type: 'text', text: evt.delta });
              }
            } else if (evt.kind === 'tool_call') {
              const existingIdx = toolUseIndexById.get(evt.id);
              if (existingIdx === undefined) {
                toolUseIndexById.set(evt.id, assistantContentBlocks.length);
                assistantContentBlocks.push({
                  type: 'tool_use',
                  id: evt.id,
                  name: evt.name,
                  input: evt.input ?? {},
                });
              } else if (evt.input !== undefined) {
                const block = assistantContentBlocks[existingIdx];
                if (block && block.type === 'tool_use') {
                  block.input = evt.input;
                }
              }
            } else if (evt.kind === 'peek_update') {
              const snap = evt.snapshot as unknown as PeekDraft | null;
              if (snap && snap.peek) {
                onPeekSnapshotRef.current?.(snap);
              }
            }
            if (evt.kind === 'tier_limit_reached') {
              const evtReason =
                'reason' in evt && typeof evt.reason === 'string'
                  ? evt.reason
                  : 'tier_hard_cap';
              if (evtReason === 'anon_signup_required') {
                router.push(
                  `/sign-up?returnTo=${encodeURIComponent(`/build/${peekId}`)}&claim=true`,
                );
                return;
              }
            }
            dispatchEvent(evt, assistantMessage.id, peekId, setMessages);
          }
        }

        const persistedUserContent: Array<
          | { type: 'image'; source: { type: 'url'; url: string } }
          | { type: 'text'; text: string }
        > = [];
        for (const img of images) {
          persistedUserContent.push({
            type: 'image',
            source: { type: 'url', url: img.url },
          });
        }
        if (trimmed) {
          persistedUserContent.push({ type: 'text', text: trimmed });
        }
        const historyUserContent: string | typeof persistedUserContent =
          persistedUserContent.length === 1 &&
          persistedUserContent[0]?.type === 'text'
            ? trimmed
            : persistedUserContent;
        apiHistoryRef.current = [
          ...apiHistoryRef.current,
          { role: 'user', content: historyUserContent },
          {
            role: 'assistant',
            content: assistantContentBlocks,
          },
        ];
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
    [peekId, router, sending, sessionId],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void send(draft, pendingImages);
    },
    [draft, pendingImages, send],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send(draft, pendingImages);
      }
    },
    [draft, pendingImages, send],
  );

  const onTextareaChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    },
    [],
  );

  const canSend = useMemo(
    () => (draft.trim().length > 0 || pendingImages.length > 0) && !sending,
    [draft, pendingImages, sending],
  );

  const ghostOptions = useMemo(
    () => computeGhostPlaceholders(peekDraft),
    [peekDraft],
  );
  const [ghostIndex, setGhostIndex] = useState(0);
  useEffect(() => {
    setGhostIndex(0);
  }, [ghostOptions]);
  useEffect(() => {
    if (ghostOptions.length <= 1) return;
    const id = window.setInterval(() => {
      setGhostIndex((i) => (i + 1) % ghostOptions.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [ghostOptions]);
  const currentPlaceholder =
    ghostOptions[ghostIndex] ?? ghostOptions[0] ?? 'What else?';

  return (
    <section
      className={cn('flex h-full min-h-0 flex-col', className)}
      style={{
        ...shellStyle(),
        borderRight: `1px solid ${vibeTokens.border}`,
      }}
      aria-label="Build chat"
    >
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 pb-32 md:pb-6"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions text"
          aria-label="Conversation with Peek"
        >
          {messages.length === 0 ? <EmptyChatHint /> : null}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} peekId={peekId} />
            ))}
          </AnimatePresence>
          <div ref={endRef} aria-hidden="true" />
        </div>
      </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="relative z-30 backdrop-blur"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--chat-bottom-offset, 0px))',
          borderTop: `1px solid ${vibeTokens.border}`,
          backgroundColor: 'hsl(var(--vibe-bg, var(--background)) / 0.92)',
        }}
        aria-label="Send a message"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
          {pendingImages.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Attached images"
            >
              {pendingImages.map((img) => (
                <ImageChip
                  key={img.id}
                  src={img.url}
                  onRemove={() => removeImage(img.id)}
                />
              ))}
            </div>
          ) : null}
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-input"
            value={draft}
            onChange={onTextareaChange}
            onKeyDown={onKeyDown}
            placeholder={currentPlaceholder}
            disabled={sending}
            rows={1}
            className="min-h-11 resize-none overflow-hidden text-base"
            aria-label="Message to Peek"
          />
          <div className="flex items-center justify-between gap-2">
            <FilePicker
              peekId={peekId}
              onUpload={addImage}
              disabled={sending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              className="min-h-11 min-w-11"
              aria-label={sending ? 'Sending message' : 'Send message'}
            >
              <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
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
  _peekId: string,
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
          ? {
              ...m,
              toolCalls: m.toolCalls.find((c) => c.id === evt.id)
                ? m.toolCalls
                : [...m.toolCalls, call],
            }
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
    const isModerationBlock = evt.error_kind === 'moderation_block';
    const moderationReply =
      isModerationBlock && typeof evt.user_message === 'string'
        ? evt.user_message
        : null;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? {
              ...m,
              streaming: false,
              toolCalls: m.toolCalls.map((c) =>
                c.status === 'pending' ? { ...c, status: 'error' } : c,
              ),
              content:
                m.content ||
                (moderationReply ? moderationReply : `Error: ${evt.message}`),
            }
          : m,
      ),
    );
  }
}

function ImageChip({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div
      className="relative h-16 w-16 overflow-hidden"
      style={{
        borderRadius: vibeTokens.radiusButton,
        border: `1px solid ${vibeTokens.border}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Attached image preview"
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 inline-flex h-6 w-6 items-center justify-center p-0.5 backdrop-blur focus-visible:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: 'hsl(var(--vibe-bg, var(--background)) / 0.9)',
          color: vibeTokens.inkSoft,
          borderRadius: vibeTokens.radiusPill,
        }}
        aria-label="Remove attached image"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function EmptyChatHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3 px-6 py-10 text-center"
      style={{
        borderRadius: vibeTokens.radiusCard,
        border: `1px dashed ${vibeTokens.borderStrong}`,
        backgroundColor: 'hsl(var(--vibe-muted, var(--muted)) / 0.45)',
        fontFamily: vibeTokens.fontBody,
      }}
    >
      <Sparkles
        className="h-6 w-6"
        style={{ color: vibeTokens.accent }}
        aria-hidden="true"
      />
      <p className="text-base" style={mutedTextStyle()}>
        We&apos;ll go back and forth. Tell me who it&apos;s for and I&apos;ll start
        building — you can drop links, screenshots, or just describe.
      </p>
    </motion.div>
  );
}

function MessageBubble({
  message,
  peekId,
}: {
  message: ChatMessage;
  peekId: string;
}) {
  const isUser = message.role === 'user';
  const showPublishCta =
    !isUser &&
    message.role === 'assistant' &&
    message.toolCalls.some(
      (c) => c.name === 'mark_ready_for_publish' && c.status === 'done',
    );
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      role="article"
      aria-label={isUser ? 'You said' : 'Peek replied'}
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0" aria-hidden="true">
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
        {isUser && message.role === 'user' && message.images && message.images.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {message.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.url}
                src={img.url}
                alt={img.alt ?? 'Attached image'}
                className="max-h-48 w-auto object-cover"
                style={{
                  borderRadius: vibeTokens.radiusButton,
                  border: `1px solid ${vibeTokens.border}`,
                }}
              />
            ))}
          </div>
        ) : null}
        {message.content ||
        (!isUser && message.role === 'assistant' && message.streaming) ? (
          <div
            className="whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed"
            style={bubbleStyle(isUser ? 'user' : 'assistant')}
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
        {showPublishCta ? (
          <div className="mt-2 w-full max-w-xs">
            <PublishCta peekId={peekId} label="Send it — $12" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ToolCallPill({ call }: { call: ToolCallEvent }) {
  const isError = call.status === 'error';
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
      style={{
        borderRadius: vibeTokens.radiusPill,
        border: `1px solid ${isError ? vibeTokens.error : vibeTokens.border}`,
        backgroundColor: isError
          ? 'hsl(var(--state-error) / 0.12)'
          : 'hsl(var(--vibe-muted, var(--muted)) / 0.55)',
        color: isError ? vibeTokens.error : vibeTokens.inkSoft,
        fontFamily: vibeTokens.fontBody,
      }}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          call.status === 'pending' && 'animate-pulse',
        )}
        style={{
          backgroundColor:
            call.status === 'pending'
              ? vibeTokens.inkSoft
              : call.status === 'done'
                ? vibeTokens.success
                : vibeTokens.error,
        }}
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
      className="ml-0.5 inline-block h-3 w-1 translate-y-[1px]"
      style={{ backgroundColor: 'currentColor' }}
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
