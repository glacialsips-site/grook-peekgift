type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Level[] = ['debug', 'info', 'warn', 'error'];
const MIN_LEVEL: Level =
  (process.env['LOG_LEVEL'] as Level) ??
  (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug');

function shouldLog(level: Level): boolean {
  return ORDER.indexOf(level) >= ORDER.indexOf(MIN_LEVEL);
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
  });
  if (level === 'error' || level === 'warn') {
    // eslint-disable-next-line no-console
    console.error(line);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(line);
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function makeLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, ctx) => emit('debug', msg, { ...bindings, ...ctx }),
    info: (msg, ctx) => emit('info', msg, { ...bindings, ...ctx }),
    warn: (msg, ctx) => emit('warn', msg, { ...bindings, ...ctx }),
    error: (msg, ctx) => emit('error', msg, { ...bindings, ...ctx }),
    child: (extra) => makeLogger({ ...bindings, ...extra }),
  };
}

export const logger: Logger = makeLogger();
