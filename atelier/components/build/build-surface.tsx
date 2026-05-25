'use client';

import { cn } from '@/lib/utils';
import { usePeekDraft } from '@/lib/peek/realtime';
import type { PeekDraft } from '@/lib/peek/types';
import { useMediaQuery } from '@/components/use-media-query';
import { ChatPane, type InitialChatMessage } from './chat-pane';
import { PreviewPane } from './preview-pane';
import { PreviewSheet } from './preview-sheet';

type Props = {
  peekId: string;
  initialDraft: PeekDraft;
  initialHistory?: InitialChatMessage[];
};

export function BuildSurface({ peekId, initialDraft, initialHistory }: Props) {
  const draft = usePeekDraft(peekId, initialDraft);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background md:flex-row">
      <ChatPane
        peekId={peekId}
        initialHistory={initialHistory ?? []}
        className={cn(
          'flex-1 md:w-2/5 md:flex-none md:border-r md:border-border',
        )}
      />
      {isDesktop ? (
        <PreviewPane
          draft={draft}
          className="flex-1 md:w-3/5 md:flex-none"
        />
      ) : (
        <PreviewSheet draft={draft} />
      )}
    </div>
  );
}
