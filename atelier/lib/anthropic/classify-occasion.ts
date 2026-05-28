import type { OccasionType } from './system-prompt';

export function classifyOccasionToTemplate(
  occasion: string | null | undefined,
): OccasionType | null {
  if (!occasion) return null;
  const s = occasion.trim().toLowerCase();
  if (s.length === 0) return null;

  if (s.includes('wedding')) return 'wedding';
  if (s.includes('bachelorette') || s.includes('bachelor party')) {
    return 'bachelorette';
  }
  if (s.includes('anniversary')) return 'anniversary';
  if (s.includes('baby') && (s.includes('shower') || s.includes('arrival'))) {
    return 'baby-shower';
  }
  if (s.includes('retire')) return 'retirement';
  if (s.includes('grad') || s.includes('graduation') || s.includes('teen')) {
    return 'teen-grad';
  }
  if (
    s.includes('christmas') ||
    s.includes('hanukkah') ||
    s.includes('holiday') ||
    s.includes('thanksgiving') ||
    s.includes('valentine')
  ) {
    return 'holiday';
  }
  if (s.includes('princess') || s.includes('kid bday') || s.includes('child')) {
    return 'princess-bday';
  }
  if (
    s.includes('milestone') ||
    /\b(50|60|70|75|80|90|100)(?:th|s)?\b/.test(s)
  ) {
    return 'milestone-bday';
  }
  if (s.includes('just because') || s.includes('just-because')) {
    return 'just-because';
  }

  return null;
}
