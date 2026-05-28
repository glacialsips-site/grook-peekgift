import 'server-only';
import { anthropic, FAST_MODEL } from '@/lib/anthropic/client';
import { env } from '@/lib/env';
import type { Vibe } from '@/db/schema/peeks';

const TONE_VALUES = ['playful', 'romantic', 'dry', 'unhinged', 'tender'] as const;
const MOTION_VALUES = ['still', 'soft', 'lively'] as const;

type Tone = (typeof TONE_VALUES)[number];
type Motion = (typeof MOTION_VALUES)[number];

export interface ToneClassification {
  tone: NonNullable<Vibe['tone']>;
  mood_words: NonNullable<Vibe['mood_words']>;
  motion: NonNullable<Vibe['motion']>;
}

const SYSTEM_PROMPT =
  "Classify the tone of a gift-giver's note. Respond ONLY as JSON: { \"tone\": one of [playful, romantic, dry, unhinged, tender], \"mood_words\": 3-5 short evocative words, \"motion\": one of [still, soft, lively] }. No prose.";

export async function classifyTone(
  noteText: string,
): Promise<ToneClassification | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  const trimmed = noteText.trim();
  if (!trimmed) return null;

  const res = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: trimmed.slice(0, 4000) }],
  });

  const block = res.content[0];
  if (!block || block.type !== 'text') return null;
  return parseClassification(block.text);
}

function parseClassification(raw: string): ToneClassification | null {
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const tone = isTone(obj['tone']) ? obj['tone'] : null;
  const motion = isMotion(obj['motion']) ? obj['motion'] : null;
  const rawMoodWords = obj['mood_words'];
  const moodWords = Array.isArray(rawMoodWords)
    ? rawMoodWords.filter(
        (w): w is string => typeof w === 'string' && w.trim().length > 0,
      )
    : [];
  if (!tone || !motion || moodWords.length === 0) return null;
  return {
    tone,
    motion,
    mood_words: moodWords.slice(0, 6),
  };
}

function isTone(value: unknown): value is Tone {
  return (
    typeof value === 'string' && (TONE_VALUES as readonly string[]).includes(value)
  );
}

function isMotion(value: unknown): value is Motion {
  return (
    typeof value === 'string' &&
    (MOTION_VALUES as readonly string[]).includes(value)
  );
}
