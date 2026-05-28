// DEV-ONLY mobile-audit fixture mounting BuildSurface against a hard-coded
// PeekDraft. Allows Playwright screenshots without hitting Supabase. Returns
// 404 in production so this never ships.
import { notFound } from 'next/navigation';
import { BuildSurface } from '@/components/build/build-surface';
import type { PeekDraft } from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

const PEEK_ID = '00000000-0000-0000-0000-0000000000aa';

const fixtureDraft: PeekDraft = {
  peek: {
    id: PEEK_ID,
    slug: 'mobile-audit-peek',
    curatorId: null,
    recipientName: 'Sam',
    relationship: 'friend',
    occasion: 'birthday',
    giverNames: ['You'],
    budgetCents: 12000,
    recipientProfile: {},
    vibe: {
      tone: 'warm',
      motion: 'soft',
      palette: {
        bg: '0 0% 100%',
        surface: '240 4.8% 97%',
        ink: '240 10% 3.9%',
        accent: '24 95% 53%',
        accent2: '280 65% 60%',
      },
    },
    heroImageUrl: null,
    heroImageSource: null,
    heroPrompt: null,
    noteMd: 'A little peek into what we might pick out for you.',
    status: 'draft',
    metadata: {},
    updatedAt: new Date().toISOString(),
  },
  cards: [
    {
      id: 'card-1',
      peekId: PEEK_ID,
      variantGroupId: null,
      position: 0,
      type: 'product',
      title: 'Soft Cotton Hoodie',
      description: 'Heather grey, supremely cozy, the kind you live in.',
      imageUrl: null,
      valueCents: 6800,
      revealValue: true,
      isTaunt: false,
      tauntText: null,
      isLocked: false,
      unlockRule: {},
      proposedDate: null,
      locationHint: null,
      addedByUserId: null,
    },
    {
      id: 'card-2',
      peekId: PEEK_ID,
      variantGroupId: null,
      position: 1,
      type: 'activity',
      title: 'Dinner at the Greek Place',
      description: 'The one with the lamb that you keep mentioning.',
      imageUrl: null,
      valueCents: 9000,
      revealValue: true,
      isTaunt: false,
      tauntText: null,
      isLocked: false,
      unlockRule: {},
      proposedDate: null,
      locationHint: null,
      addedByUserId: null,
    },
  ],
  variantGroups: [],
};

export default function MobileAuditBuildPage() {
  if (process.env['NODE_ENV'] === 'production') notFound();
  return (
    <BuildSurface
      peekId={PEEK_ID}
      initialDraft={fixtureDraft}
      initialHistory={[
        {
          role: 'user',
          content: "It's Sam's birthday next week — she's into cozy stuff and Greek food",
          toolCallId: null,
          createdAt: new Date(Date.now() - 60_000).toISOString(),
        },
        {
          role: 'assistant',
          content:
            "Got it. Sam's birthday, cozy + Greek vibes. Want me to add a soft hoodie and a dinner-at-the-Greek-place card?",
          toolCallId: null,
          createdAt: new Date(Date.now() - 50_000).toISOString(),
        },
      ]}
      anonSessionId={null}
    />
  );
}
