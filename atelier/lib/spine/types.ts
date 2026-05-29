import type { Card } from '@/db/schema';
import type { Vibe } from '@/db/schema/peeks';

export interface SpineWirePeek {
  id: string;
  slug: string;
  recipientName: string | null;
  occasion: string | null;
  heroImageUrl: string | null;
  noteMd: string | null;
  giverNames: string[];
  vibe: Vibe;
  status: string;
}

export interface SpineWireCard {
  id: string;
  position: number;
  type: Card['type'];
  title: string;
  description: string | null;
  imageUrl: string | null;
  valueCents: number | null;
  revealValue: boolean;
  isTaunt: boolean;
  tauntText: string | null;
  variantGroupId: string | null;
}

export interface SpineState {
  peek: SpineWirePeek;
  cards: SpineWireCard[];
}

export type SpineSseEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; ok: boolean; summary: string }
  | { type: 'state'; state: SpineState }
  | { type: 'done' }
  | { type: 'error'; message: string };
