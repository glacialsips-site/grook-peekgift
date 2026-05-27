'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePeekDraft } from '@/lib/peek/realtime';
import type { PeekDraft } from '@/lib/peek/types';
import { useMediaQuery } from '@/components/use-media-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { ChatPane, type InitialChatMessage } from './chat-pane';
import { PreviewPane } from './preview-pane';
import { PreviewSheet } from './preview-sheet';

type Props = {
  peekId: string;
  initialDraft: PeekDraft;
  initialHistory?: InitialChatMessage[];
  anonSessionId?: string | null;
};

type ViewAs = 'curator' | 'recipient';

function ChatFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 border-r border-border bg-background p-6 text-center md:w-2/5 md:flex-none">
      <p className="text-sm font-medium">Chat hit a snag.</p>
      <p className="text-xs text-muted-foreground">
        Your draft is saved. Reload this pane to keep going.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
      >
        Reload chat
      </button>
    </div>
  );
}

function PreviewFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background p-6 text-center md:w-3/5 md:flex-none">
      <p className="text-sm font-medium">Preview hit a snag.</p>
      <p className="text-xs text-muted-foreground">
        Chat still works — reload the preview when you&apos;re ready.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
      >
        Reload preview
      </button>
    </div>
  );
}

export function BuildSurface({ peekId, initialDraft, initialHistory, anonSessionId }: Props) {
  const { draft, applySnapshot } = usePeekDraft(peekId, initialDraft);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [viewAs, setViewAs] = useState<ViewAs>('curator');

  return (
    <main
      id="main"
      className="flex h-[100dvh] min-h-0 overflow-hidden flex-col bg-background md:flex-row"
      style={
        isDesktop
          ? undefined
          : ({ '--chat-bottom-offset': '92px' } as React.CSSProperties)
      }
      aria-label="Build your Peek"
    >
      <ErrorBoundary
        label="chat-pane"
        fallback={({ reset }) => <ChatFallback reset={reset} />}
      >
        <ChatPane
          peekId={peekId}
          initialHistory={initialHistory ?? []}
          onPeekSnapshot={applySnapshot}
          peekDraft={draft}
          anonSessionId={anonSessionId ?? null}
          className={cn(
            'flex-1 md:w-2/5 md:flex-none md:border-r md:border-border min-h-0',
          )}
        />
      </ErrorBoundary>
      <ErrorBoundary
        label="preview-pane"
        fallback={({ reset }) => <PreviewFallback reset={reset} />}
      >
        {isDesktop ? (
          <div className="relative flex-1 md:w-3/5 md:flex-none min-h-0 overflow-y-auto">
            {viewAs === 'curator' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewAs('recipient')}
                className="absolute right-3 top-3 z-20 gap-1.5 text-xs shadow-sm"
                aria-label="Preview this Peek as the recipient"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                View as: Curator
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => setViewAs('curator')}
                className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
                aria-label="Return to curator view"
              >
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
                Back to curator view
              </button>
            )}
            <PreviewPane
              draft={draft}
              className="h-full"
              // @ts-expect-error pending parallel merge of preview-pane viewAs prop
              viewAs={viewAs}
            />
          </div>
        ) : (
          <PreviewSheet draft={draft} />
        )}
      </ErrorBoundary>
    </main>
  );
}
