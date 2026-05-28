import { notFound } from 'next/navigation';
import { RecipientView } from '@/components/recipient/recipient-view';
import type { PeekDraft } from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

const PEEK_ID = '00000000-0000-0000-0000-0000000000bb';

const fixtureDraft: PeekDraft = {
  peek: {
    id: PEEK_ID,
    slug: 'mobile-audit-recipient',
    curatorId: null,
    recipientName: 'Sam',
    relationship: 'friend',
    occasion: 'birthday',
    giverNames: ['Alex'],
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
    noteMd:
      'Happy birthday, Sam. You get to pick **one** of these — and yes, the Ferrari is just to mess with you.',
    status: 'published',
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
    {
      id: 'card-3',
      peekId: PEEK_ID,
      variantGroupId: null,
      position: 2,
      type: 'aspirational',
      title: 'Brand New Ferrari',
      description: 'You wish.',
      imageUrl: null,
      valueCents: 28000000,
      revealValue: false,
      isTaunt: true,
      tauntText: 'No way you get this one, lol.',
      isLocked: false,
      unlockRule: {},
      proposedDate: null,
      locationHint: null,
      addedByUserId: null,
    },
  ],
  variantGroups: [],
};

export default function MobileAuditRecipientPage() {
  if (process.env['NODE_ENV'] === 'production') notFound();
  return (
    <RecipientView draft={fixtureDraft} peekId={PEEK_ID} initialPicks={[]} />
  );
}
