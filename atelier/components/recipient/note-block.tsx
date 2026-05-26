'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Peek } from '@/lib/peek/types';

type Props = {
  peek: Peek;
  revealed: boolean;
};

const TYPE_INTERVAL_MS = 26;
const TYPE_MAX_CHARS = 280;

export function NoteBlock({ peek, revealed }: Props) {
  const note = peek.noteMd ?? '';
  const shouldType = !revealed && note.length > 0 && note.length <= TYPE_MAX_CHARS;
  const [typed, setTyped] = useState(shouldType ? '' : note);

  useEffect(() => {
    if (revealed) {
      setTyped(note);
      return;
    }
    if (!shouldType) {
      setTyped(note);
      return;
    }
    setTyped('');
    let idx = 0;
    const tick = () => {
      idx += 1;
      setTyped(note.slice(0, idx));
    };
    const handle = setInterval(() => {
      tick();
      if (idx >= note.length) clearInterval(handle);
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [note, revealed, shouldType]);

  if (!note) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'prose prose-sm max-w-none text-[hsl(var(--peek-ink))]',
        'prose-headings:text-[hsl(var(--peek-ink))]',
        'prose-strong:text-[hsl(var(--peek-ink))]',
        'prose-a:text-[hsl(var(--peek-accent))]',
      )}
      aria-label="A note from the giver"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{typed}</ReactMarkdown>
      {shouldType && typed.length < note.length ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[hsl(var(--peek-ink))]/70 align-middle"
        />
      ) : null}
    </motion.section>
  );
}
