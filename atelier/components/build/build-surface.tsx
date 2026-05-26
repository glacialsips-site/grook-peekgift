'use client';

import { cn } from '@/lib/utils';
import { usePeekDraft } from '@/lib/peek/realtime';
import type { PeekDraft } from '@/lib/peek/types';
import { useMediaQuery } from '@/components/use-media-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { ChatPane, type InitialChatMessage } from './chat-pane';
import { PreviewPane } from './preview-pane';
import { PreviewSheet } from './preview-sheet';

type Props = {
  peekId: string;
  initialDraft: PeekDraft;
  initialHistory?: InitialChatMessage[];
};

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

export function BuildSurface({ peekId, initialDraft, initialHistory }: Props) {
  const { draft, applySnapshot } = usePeekDraft(peekId, initialDraft);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <main
      id="main"
      className="flex h-[100dvh] min-h-0 flex-col bg-background md:flex-row"
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
          className={cn(
            'flex-1 md:w-2/5 md:flex-none md:border-r md:border-border',
          )}
        />
      </ErrorBoundary>
      <ErrorBoundary
        label="preview-pane"
        fallback={({ reset }) => <PreviewFallback reset={reset} />}
      >
        {isDesktop ? (
          <PreviewPane
            draft={draft}
            className="flex-1 md:w-3/5 md:flex-none"
          />
        ) : (
          <PreviewSheet draft={draft} />
        )}
      </ErrorBoundary>
    </main>
  );
}
