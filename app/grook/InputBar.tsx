'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PlusMenu from './PlusMenu';
import MicButton from './MicButton';
import type { Attachment } from './types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function fileToAttachment(file: File): Promise<Attachment | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        dataUrl,
        mediaType: file.type,
        base64,
        name: file.name,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function InputBar({
  onSend,
  streaming,
  onStop,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  streaming: boolean;
  onStop: () => void;
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const out: Attachment[] = [];
    for (const f of arr) {
      const att = await fileToAttachment(f);
      if (att) out.push(att);
    }
    if (out.length) setAttachments((prev) => [...prev, ...out]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSend = useCallback(() => {
    if (streaming) return;
    if (!text.trim() && attachments.length === 0) return;
    onSend(text, attachments);
    setText('');
    setAttachments([]);
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto';
      taRef.current?.focus();
    });
  }, [text, attachments, streaming, onSend]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (const item of e.clipboardData.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const onTranscript = useCallback((partial: string, final: boolean) => {
    setText((prev) => {
      if (final) {
        const sep = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + sep + partial;
      }
      return prev;
    });
  }, []);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className="border-t border-white/5 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] bg-[var(--chrome-bg)]">
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1">
          {attachments.map((a) => (
            <div key={a.id} className="relative shrink-0">
              <img
                src={a.dataUrl}
                alt=""
                className="h-16 w-16 object-cover rounded-xl border border-white/10"
              />
              <button
                onClick={() => removeAttachment(a.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black text-white text-xs flex items-center justify-center border border-white/20"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setPlusOpen(true)}
          className="shrink-0 h-10 w-10 rounded-full bg-white/8 hover:bg-white/12 active:scale-95 transition flex items-center justify-center text-white/80 text-xl leading-none"
          aria-label="Attach"
        >
          +
        </button>

        <div className="flex-1 rounded-3xl bg-white/8 px-4 py-2.5 flex items-end gap-2 min-h-[44px]">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Chat with Peek…"
            className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none resize-none text-[15px] leading-6 py-1 max-h-[200px]"
          />
        </div>

        <MicButton onTranscript={onTranscript} disabled={streaming} />

        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 h-10 w-10 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition"
            aria-label="Stop"
          >
            <span className="block h-3 w-3 bg-black rounded-sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasContent}
            className={[
              'shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition active:scale-95',
              hasContent ? 'bg-white text-black' : 'bg-white/15 text-white/30 cursor-not-allowed',
            ].join(' ')}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      <PlusMenu open={plusOpen} onClose={() => setPlusOpen(false)} onFiles={addFiles} />
    </div>
  );
}
