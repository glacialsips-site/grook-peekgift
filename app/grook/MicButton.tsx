'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  onTranscript: (text: string, final: boolean) => void;
  disabled?: boolean;
};

export default function MicButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      let finalChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
      }
      if (finalChunk) onTranscript(finalChunk.trim(), true);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
      recRef.current = null;
    };
  }, [onTranscript]);

  const toggle = useCallback(() => {
    if (!supported || disabled) return;
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {}
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {}
    }
  }, [listening, supported, disabled]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={[
        'shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition active:scale-95',
        listening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-white/8 hover:bg-white/12 text-white/80',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
