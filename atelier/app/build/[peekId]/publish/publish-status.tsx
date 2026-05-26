'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { DbRow } from '@/lib/supabase/database.types';
import type { PeekStatus } from '@/lib/peek/types';

type Props = {
  peekId: string;
  initialStatus: PeekStatus;
  initialShareUrl: string | null;
  initialSlug: string;
  sessionId: string | null;
  mock: boolean;
};

const PEEK_STATUSES = ['draft', 'published', 'claimed', 'archived'] as const;

function isPeekStatus(value: unknown): value is PeekStatus {
  return (
    typeof value === 'string' &&
    (PEEK_STATUSES as readonly string[]).includes(value)
  );
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

export function PublishStatus({
  peekId,
  initialStatus,
  initialShareUrl,
  initialSlug,
  sessionId,
  mock,
}: Props) {
  const [status, setStatus] = useState<PeekStatus>(initialStatus);
  const [shareUrl, setShareUrl] = useState<string | null>(initialShareUrl);
  const [slug, setSlug] = useState<string>(initialSlug);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === 'published' || status === 'claimed') return;

    const sb = getSupabaseBrowser();
    let cancelled = false;
    const channel = sb
      .channel(`publish:${peekId}`)
      .on(
        'postgres_changes' as never,
        {
          event: 'UPDATE',
          schema: 'peek_v2',
          table: 'peeks',
          filter: `id=eq.${peekId}`,
        },
        (payload: { new: Partial<DbRow<'peeks'>> }) => {
          if (cancelled) return;
          const row = payload.new;
          if (isPeekStatus(row.status)) setStatus(row.status);
          if (typeof row.share_url === 'string') setShareUrl(row.share_url);
          if (typeof row.slug === 'string') setSlug(row.slug);
        },
      )
      .subscribe();

    const startedAt = Date.now();
    const poll = async () => {
      if (cancelled) return;
      const { data } = await sb
        .from('peeks')
        .select('status, share_url, slug')
        .eq('id', peekId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setStatus(data.status);
        if (data.share_url) setShareUrl(data.share_url);
        if (data.slug) setSlug(data.slug);
        if (data.status === 'published' || data.status === 'claimed') return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [peekId, status]);

  const isPublished = status === 'published' || status === 'claimed';
  const finalShareUrl =
    shareUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/g/${slug}`
      : `/g/${slug}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(finalShareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!isPublished) {
    return (
      <main
        id="main"
        className="flex min-h-[100dvh] items-center justify-center bg-background px-6"
        aria-busy="true"
        aria-label="Finalizing your Peek"
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center gap-4 text-center"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold">Wrapping it up…</h1>
          <p
            className="text-base text-muted-foreground"
            aria-live="polite"
          >
            {mock
              ? 'Finalizing your Peek.'
              : 'Confirming your payment with Stripe. This usually takes a few seconds.'}
          </p>
          {sessionId ? (
            <p className="text-xs text-muted-foreground/70">
              Session {sessionId.slice(0, 12)}…
            </p>
          ) : null}
          {timedOut ? (
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
              Still waiting on confirmation. You can safely refresh this page.
            </p>
          ) : null}
        </motion.div>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="flex min-h-[100dvh] items-center justify-center bg-background px-6"
      aria-label="Peek published"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      >
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
        >
          <Check className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Peek is live.
          </h1>
          <p className="text-base text-muted-foreground">
            Share the link with your person — they&apos;ll see it just for them.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left">
            <ExternalLink
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate text-sm" title={finalShareUrl}>
              {finalShareUrl}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={copyLink}
              className="min-h-11 flex-1"
              type="button"
              aria-label={copied ? 'Link copied' : 'Copy share link'}
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Copy link
                </>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              type="button"
              className="min-h-11"
            >
              <Link href="./share" aria-label="Open share options">
                <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Share
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
