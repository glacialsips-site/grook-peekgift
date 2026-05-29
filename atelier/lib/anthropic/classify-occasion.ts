import type { OccasionType } from './system-prompt';

/**
 * Map a free-text occasion field (whatever the curator or `set_recipient`
 * stored) to one of the canonical 22-occasion taxonomy keys (`OccasionType`,
 * sourced from `lib/vibe/grammar/presets.ts`).
 *
 * Returns null when nothing matches. A returned key does NOT guarantee a skill
 * template — only the subset in `OCCASION_TEMPLATES` injects one; the rest still
 * classify (useful as peek metadata and for the curator preset map) and Block 3
 * simply omits the occasion-template skill. A follow-up Haiku classifier (per
 * CAPABILITY_INVENTORY §H2) can handle the long tail.
 */
export function classifyOccasionToTemplate(
  occasion: string | null | undefined,
): OccasionType | null {
  if (!occasion) return null;
  const s = occasion.trim().toLowerCase();
  if (s.length === 0) return null;

  // — Weddings & couples —
  if (s.includes('wedding')) return 'wedding';
  if (s.includes('engagement') || s.includes('engaged') || s.includes('proposal')) {
    return 'engagement';
  }
  if (s.includes('anniversary')) return 'anniversary';
  if (s.includes('divorce')) return 'divorce';

  // — Pre-wedding parties (bachelorette before bachelor: the longer match wins) —
  if (
    s.includes('bachelorette') ||
    s.includes('hen party') ||
    s.includes('hen do') ||
    s.includes('hen night')
  ) {
    return 'bachelorette';
  }
  if (s.includes('bachelor') || s.includes('stag')) return 'bachelor';

  // — Babies —
  if (s.includes('baby') && (s.includes('shower') || s.includes('gender reveal'))) {
    return 'baby-shower';
  }
  if (
    s.includes('newborn') ||
    (s.includes('baby') && (s.includes('arriv') || s.includes('born') || s.includes('welcome')))
  ) {
    return 'baby-arrival';
  }

  // — Career / home transitions —
  if (s.includes('retire')) return 'retirement';
  if (
    s.includes('promotion') ||
    s.includes('new job') ||
    s.includes('new gig') ||
    s.includes('raise') ||
    s.includes('made partner')
  ) {
    return 'promotion-new-job';
  }
  if (
    s.includes('housewarming') ||
    s.includes('new home') ||
    s.includes('new place') ||
    s.includes('new apartment') ||
    s.includes('moved in') ||
    s.includes('new house')
  ) {
    return 'housewarming';
  }

  // — Education —
  if (s.includes('graduat') || /\bgrad\b/.test(s) || s.includes('commencement')) {
    return 'graduation';
  }

  // — Care —
  if (
    s.includes('sympathy') ||
    s.includes('condolence') ||
    s.includes('bereavement') ||
    s.includes('funeral') ||
    s.includes('memorial') ||
    s.includes('passed away') ||
    s.includes('loss of')
  ) {
    return 'sympathy';
  }
  if (
    s.includes('get well') ||
    s.includes('get-well') ||
    s.includes('recovery') ||
    s.includes('feel better') ||
    s.includes('surgery')
  ) {
    return 'get-well';
  }

  // — Holidays (tender before cheerful: person-specific days route to tender) —
  if (
    s.includes('valentine') ||
    s.includes("mother's day") ||
    s.includes('mothers day') ||
    s.includes("father's day") ||
    s.includes('fathers day')
  ) {
    return 'holiday-tender';
  }
  if (
    s.includes('christmas') ||
    s.includes('hanukkah') ||
    s.includes('diwali') ||
    s.includes('lunar new year') ||
    s.includes('holiday') ||
    s.includes('thanksgiving')
  ) {
    return 'holiday-cheerful';
  }

  // — Birthdays (most specific → general) —
  if (
    s.includes('milestone') ||
    /\b(30|40|50|60|70|80|90|100)(?:th|st|nd|rd|s)?\b/.test(s)
  ) {
    return 'milestone-bday';
  }
  if (
    s.includes('princess') ||
    s.includes('kid bday') ||
    s.includes("kid's birthday") ||
    s.includes('child')
  ) {
    return 'kid-bday-littles';
  }
  if (s.includes('tween')) return 'kid-bday-tween';
  if (s.includes('teen')) return 'teen-bday';
  if (s.includes('birthday')) return 'bday-adult';

  // — Catch-all —
  if (s.includes('just because') || s.includes('just-because')) return 'just-because';

  return null;
}
