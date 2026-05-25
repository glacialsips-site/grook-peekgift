'use client';

import { useState } from 'react';
import { MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePeekDraft } from '@/lib/peek/realtime';
import type { PeekDraft } from '@/lib/peek/types';
import { ChatPane } from './chat-pane';
import { PreviewPane } from './preview-pane';

type Props = {
  peekId: string;
  initialDraft: PeekDraft;
};

type MobileView = 'chat' | 'preview';

export function BuildSurface({ peekId, initialDraft }: Props) {
  const draft = usePeekDraft(peekId, initialDraft);
  const [mobileView, setMobileView] = useState<MobileView>('chat');

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background md:flex-row">
      <ChatPane
        peekId={peekId}
        className={cn(
          'flex-1 md:w-2/5 md:flex-none md:border-r md:border-border',
          mobileView === 'chat' ? 'flex' : 'hidden md:flex',
        )}
      />
      <PreviewPane
        draft={draft}
        className={cn(
          'flex-1 md:w-3/5 md:flex-none',
          mobileView === 'preview' ? 'flex' : 'hidden md:flex',
        )}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center md:hidden">
        <div className="pointer-events-auto inline-flex items-center rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button
            type="button"
            variant={mobileView === 'chat' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setMobileView('chat')}
            aria-pressed={mobileView === 'chat'}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Chat
          </Button>
          <Button
            type="button"
            variant={mobileView === 'preview' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setMobileView('preview')}
            aria-pressed={mobileView === 'preview'}
          >
            <Smartphone className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
