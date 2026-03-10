type LogLevel = 'info' | 'warn' | 'error';

// Capture the original console methods at module load time.
// server.ts overrides console.error/console.warn to route through this logger; if we used the
// (possibly patched) console methods here we could recurse until the process crashes.
const rawConsoleLog = console.log.bind(console);
const rawConsoleWarn = console.warn.bind(console);
const rawConsoleError = console.error.bind(console);

const MAX_LINE_CHARS = Number(process.env.LOG_MAX_CHARS ?? 20000);
const MAX_STRING_CHARS = Number(process.env.LOG_MAX_STRING_CHARS ?? 5000);

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}...[truncated]` : s);

const safeStringify = (value: unknown) => {
  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'string') return truncate(v, MAX_STRING_CHARS);
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    });
    return truncate(json, MAX_LINE_CHARS);
  } catch (err) {
    // Keep the fallback tiny and reliable.
    try {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'logger-stringify-failed',
        error: String(err)
      });
    } catch {
      return '{"level":"error","message":"logger-stringify-failed"}';
    }
  }
};

const writeLog = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {})
  };
  const line = safeStringify(payload);
  if (level === 'error') {
    rawConsoleError(line);
    return;
  }
  if (level === 'warn') {
    rawConsoleWarn(line);
    return;
  }
  rawConsoleLog(line);
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => writeLog('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog('error', message, meta)
};
