'use client';

import { useEffect, useMemo, useState } from 'react';
import posthog from 'posthog-js';
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94" />
    </svg>
  );
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

type Props = {
  peekId: string;
  slug: string;
  shareUrl: string;
  recipientName: string | null;
  occasion: string | null;
  curatorName: string | null;
  ogImageUrl: string;
};

type Channel = 'sms' | 'email';

type ShareChannel =
  | 'copy'
  | 'native'
  | 'twitter'
  | 'facebook'
  | 'whatsapp'
  | 'imessage'
  | 'email';

type SendResponse =
  | { ok: true; id?: string; sid?: string }
  | { error: string };

function trackShare(peekId: string, channel: ShareChannel): void {
  try {
    posthog.capture('share_initiated', { peek_id: peekId, channel });
  } catch {
    /* posthog not initialized */
  }
}

function trackShareFormSubmit(peekId: string, channel: Channel): void {
  try {
    posthog.capture('share_form_submitted', { peek_id: peekId, channel });
  } catch {
    /* posthog not initialized */
  }
}

function shareText(recipientName: string | null, occasion: string | null): string {
  if (recipientName && occasion) {
    return `I made a Peek for ${recipientName} (${occasion}). Take a look:`;
  }
  if (recipientName) {
    return `I made a Peek for ${recipientName}. Take a look:`;
  }
  return 'I made you a Peek. Take a look:';
}

function platformLinks(shareUrl: string, text: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);
  const fullBody = encodeURIComponent(`${text} ${shareUrl}`);
  return {
    sms: `sms:?&body=${fullBody}`,
    whatsapp: `https://wa.me/?text=${fullBody}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent('A Peek for you')}&body=${fullBody}`,
  };
}

export function ShareSheet({
  peekId,
  slug,
  shareUrl,
  recipientName,
  occasion,
  curatorName,
  ogImageUrl,
}: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [channel, setChannel] = useState<Channel>('sms');
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState(
    () =>
      `${shareText(recipientName, occasion)}\n\nLove,\n${curatorName ?? ''}`.trim(),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHasNativeShare(
      typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function',
    );
  }, []);

  const links = useMemo(
    () => platformLinks(shareUrl, shareText(recipientName, occasion)),
    [shareUrl, recipientName, occasion],
  );

  async function handleCopy() {
    trackShare(peekId, 'copy');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Link copied', description: shareUrl });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: 'Try long-pressing the link instead.',
        variant: 'destructive',
      });
    }
  }

  async function handleNativeShare() {
    trackShare(peekId, 'native');
    try {
      await navigator.share({
        title: recipientName
          ? `A Peek for ${recipientName}`
          : 'A Peek for you',
        text: shareText(recipientName, occasion),
        url: shareUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!destination.trim()) {
      toast({
        title: 'Where to?',
        description: channel === 'sms' ? 'Add a phone number.' : 'Add an email.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    trackShareFormSubmit(peekId, channel);
    try {
      const res = await fetch('/api/share/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          peekId,
          channel,
          destination: destination.trim(),
          message,
          senderName: curatorName ?? undefined,
        }),
      });
      const data = (await res.json()) as SendResponse;
      if (!res.ok || 'error' in data) {
        const error = 'error' in data ? data.error : 'send_failed';
        if (error === 'sms_not_configured') {
          toast({
            title: 'SMS not set up yet',
            description:
              'Try iMessage / WhatsApp / email from the quick-share row.',
            variant: 'destructive',
          });
        } else if (error === 'email_not_configured') {
          toast({
            title: 'Email not configured',
            description: 'Copy the link or use the mail button below.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: "Couldn't send",
            description: error,
            variant: 'destructive',
          });
        }
        return;
      }
      toast({
        title: 'Sent.',
        description: channel === 'sms' ? destination : `Email to ${destination}`,
      });
      setDestination('');
    } catch (err) {
      toast({
        title: "Couldn't send",
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          published
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {recipientName
            ? `${recipientName}'s Peek is live.`
            : 'Your Peek is live.'}
        </h1>
        <p className="text-muted-foreground">
          Now spread it. The link is yours. Share it however {recipientName?.split(' ')[0] ?? 'they'} will
          actually open it.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-[1200/630] w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogImageUrl}
            alt={`Preview of the Peek for ${recipientName ?? 'them'}`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{shareUrl}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {hasNativeShare ? (
            <Button type="button" onClick={handleNativeShare} className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share via...
            </Button>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Quick share
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <a
            href={links.sms}
            onClick={() => trackShare(peekId, 'imessage')}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-accent"
            aria-label="Share via iMessage"
          >
            <MessageCircle className="h-5 w-5" />
            iMessage
          </a>
          <a
            href={links.whatsapp}
            onClick={() => trackShare(peekId, 'whatsapp')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-accent"
            aria-label="Share via WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
          <a
            href={links.twitter}
            onClick={() => trackShare(peekId, 'twitter')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-accent"
            aria-label="Share on X"
          >
            <XIcon className="h-5 w-5" />X
          </a>
          <a
            href={links.facebook}
            onClick={() => trackShare(peekId, 'facebook')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-accent"
            aria-label="Share on Facebook"
          >
            <FacebookIcon className="h-5 w-5" />
            Facebook
          </a>
          <a
            href={links.email}
            onClick={() => trackShare(peekId, 'email')}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-accent"
            aria-label="Share via email"
          >
            <Mail className="h-5 w-5" />
            Email
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Send it for me
        </h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="inline-flex w-full rounded-full border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors ${
                channel === 'sms'
                  ? 'bg-background shadow'
                  : 'text-muted-foreground'
              }`}
              aria-pressed={channel === 'sms'}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors ${
                channel === 'email'
                  ? 'bg-background shadow'
                  : 'text-muted-foreground'
              }`}
              aria-pressed={channel === 'email'}
            >
              Email
            </button>
          </div>
          <Input
            type={channel === 'sms' ? 'tel' : 'email'}
            inputMode={channel === 'sms' ? 'tel' : 'email'}
            placeholder={
              channel === 'sms' ? '+1 555 123 4567' : 'them@example.com'
            }
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            autoComplete="off"
          />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="A short note to go with the link..."
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send {channel === 'sms' ? 'text' : 'email'}
          </Button>
        </form>
      </section>

      <p className="text-xs text-muted-foreground">
        slug: <span className="font-mono">{slug}</span>
      </p>
    </div>
  );
}
