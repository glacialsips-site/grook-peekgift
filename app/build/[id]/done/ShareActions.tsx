'use client';

import { useState } from 'react';

export default function ShareActions({
  shareUrl,
  recipientName,
  occasion
}: {
  shareUrl: string;
  recipientName: string;
  occasion: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const smsBody = encodeURIComponent(
    `${recipientName} — i made you something. open this: ${shareUrl}`
  );
  const emailSubject = encodeURIComponent(`for ${recipientName} — open this`);
  const emailBody = encodeURIComponent(
    `${recipientName},\n\nmade you a thing. open it: ${shareUrl}\n\n${occasion || ''}`
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as any).share({
          title: `a peek for ${recipientName}`,
          text: `${recipientName} — i made you something.`,
          url: shareUrl
        });
        return;
      } catch {}
    }
    copy();
  }

  return (
    <div className="space-y-2">
      <button
        onClick={nativeShare}
        className="w-full rounded-full bg-[var(--peek-accent)] text-black px-5 py-3.5 font-medium hover:opacity-90 transition"
      >
        share with {recipientName}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <a
          href={`sms:?&body=${smsBody}`}
          className="text-center rounded-full bg-white/10 text-white px-3 py-2.5 text-sm hover:bg-white/15"
        >
          SMS
        </a>
        <a
          href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="text-center rounded-full bg-white/10 text-white px-3 py-2.5 text-sm hover:bg-white/15"
        >
          email
        </a>
        <button
          onClick={copy}
          className="text-center rounded-full bg-white/10 text-white px-3 py-2.5 text-sm hover:bg-white/15"
        >
          {copied ? 'copied!' : 'copy link'}
        </button>
      </div>
      <div className="text-center rounded-2xl bg-white/5 px-3 py-2.5 text-xs break-all text-[var(--chrome-mute)]">
        {shareUrl}
      </div>
    </div>
  );
}
