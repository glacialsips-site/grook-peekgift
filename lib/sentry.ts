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
    // Dynamic require so the package is only loaded if a DSN is configured.
    // Package isn't in package.json by default to avoid build-time webpack-plugin weirdness;
    // when you decide to wire Sentry, run `npm i @sentry/nextjs` and set SENTRY_DSN.
    const mod = await (Function('return import("@sentry/nextjs")')() as Promise<any>);
    mod.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV || 'production' });
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
