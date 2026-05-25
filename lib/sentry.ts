// Light Sentry wrapper. No-op when SENTRY_DSN is missing — never blocks requests.
// We initialize lazily so an unset DSN doesn't even load the SDK code in dev.

let _inited = false;
let _Sentry: any = null;

async function ensureInit() {
  if (_inited) return _Sentry;
  _inited = true;
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const mod = await import('@sentry/nextjs');
    mod.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'production'
    });
    _Sentry = mod;
    return _Sentry;
  } catch {
    return null;
  }
}

export async function reportError(err: unknown, ctx: Record<string, any> = {}): Promise<void> {
  try {
    const S = await ensureInit();
    if (!S) {
      console.error('[peek-vnext error]', err, ctx);
      return;
    }
    S.captureException(err, { extra: ctx });
  } catch {}
}
