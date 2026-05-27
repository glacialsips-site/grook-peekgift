'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './types';

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-orange-400 text-3xl mb-3">✻</div>
        <h1 className="font-display text-2xl md:text-3xl text-white/90 mb-2">
          Let's make something they'll actually pick from.
        </h1>
        <p className="text-white/50 text-sm max-w-sm">
          Tell me about who this is for. A name, a photo, a vibe — talk, type, paste, whatever.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-chat px-3 md:px-4 py-4 space-y-3">
      {messages.map((m) => (
        <Bubble key={m.id} message={m} />
      ))}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const text = message.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const images = message.content.filter(
    (b): b is { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } =>
      b.type === 'image'
  );

  return (
    <div className={`flex chat-msg-enter ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {images.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.source.media_type};base64,${img.source.data}`}
                alt=""
                className="rounded-2xl max-h-64 object-cover border border-white/10"
              />
            ))}
          </div>
        )}
        {(text || message.pending) && (
          <div
            className={[
              'px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words',
              isUser
                ? 'bg-white text-black rounded-3xl rounded-br-md'
                : 'text-white/90',
            ].join(' ')}
          >
            {text || (message.pending ? <TypingDots /> : null)}
            {message.pending && text && <span className="inline-block w-1.5 h-4 bg-white/60 align-[-2px] ml-0.5 animate-pulse" />}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '180ms' }} />
      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '360ms' }} />
    </span>
  );
}
