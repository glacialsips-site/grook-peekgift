import 'server-only';

function firstHeader(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

export function getClientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  const forwarded = firstHeader(req.headers.get('x-forwarded-for'));
  if (forwarded) return forwarded;
  const cf = firstHeader(req.headers.get('cf-connecting-ip'));
  if (cf) return cf;
  const real = firstHeader(req.headers.get('x-real-ip'));
  if (real) return real;
  return '0.0.0.0';
}
