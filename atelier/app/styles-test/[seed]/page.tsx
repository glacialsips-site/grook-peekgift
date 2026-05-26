import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { PreviewPane } from '@/components/build/preview-pane';
import type { Card, PeekDraft, Vibe, VariantGroup } from '@/lib/peek/types';

export const dynamic = 'force-dynamic';

type SeedPayload = {
  peek: {
    id?: string;
    slug?: string;
    recipientName: string;
    relationship: string | null;
    occasion: string | null;
    heroImageUrl: string | null;
    noteMd: string | null;
    vibe: Vibe;
  };
  cards: Array<{
    title: string;
    description: string;
    valueCents?: number;
    imageUrl?: string | null;
  }>;
};

function loadSeed(seed: string): SeedPayload | null {
  const safe = seed.replace(/[^a-z0-9_-]/gi, '');
  const p = path.join('/tmp', `styles-seed-${safe}.json`);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw) as SeedPayload;
  } catch {
    return null;
  }
}

function toDraft(payload: SeedPayload): PeekDraft {
  const peekId = payload.peek.id ?? '00000000-0000-0000-0000-000000000000';
  const cards: Card[] = payload.cards.map((c, i) => ({
    id: `card-${i}`,
    peekId,
    variantGroupId: null,
    position: i,
    type: 'product',
    title: c.title,
    description: c.description ?? null,
    imageUrl: c.imageUrl ?? null,
    valueCents: c.valueCents ?? null,
    revealValue: c.valueCents != null,
    isTaunt: false,
    tauntText: null,
    isLocked: false,
    unlockRule: {},
    proposedDate: null,
    locationHint: null,
    addedByUserId: null,
  }));
  const variantGroups: VariantGroup[] = [];
  return {
    peek: {
      id: peekId,
      slug: payload.peek.slug ?? 'test-slug',
      curatorId: null,
      recipientName: payload.peek.recipientName,
      relationship: payload.peek.relationship,
      occasion: payload.peek.occasion,
      giverNames: [],
      budgetCents: null,
      recipientProfile: {},
      vibe: payload.peek.vibe,
      heroImageUrl: payload.peek.heroImageUrl,
      heroImageSource: null,
      heroPrompt: null,
      noteMd: payload.peek.noteMd,
      status: 'draft',
      metadata: {},
      updatedAt: new Date().toISOString(),
    },
    cards,
    variantGroups,
  };
}

export default async function StylesTestPage({
  params,
}: {
  params: Promise<{ seed: string }>;
}) {
  const { seed } = await params;
  const payload = loadSeed(seed);
  if (!payload) notFound();
  const draft = toDraft(payload);
  return (
    <div className="h-[100dvh] w-[100vw] bg-white">
      <PreviewPane draft={draft} className="h-full w-full" />
    </div>
  );
}
