import { env } from "../env";

/**
 * Configurable auth diagnostics logger (#4).
 *
 * Goal: keep local development consoles clean while production retains useful
 * auth diagnostics. Toggle with the `AUTH_LOG_ENABLED` env var:
 *
 *   AUTH_LOG_ENABLED=true   -> always log
 *   AUTH_LOG_ENABLED=false  -> never log (except hard errors)
 *   (unset)                 -> log only in production
 *
 * `error` always logs regardless of the flag — a genuine auth failure is a
 * diagnostic we never want to silently swallow.
 */
const enabled =
  env.AUTH_LOG_ENABLED ?? env.NODE_ENV === "production";

type Meta = Record<string, unknown> | undefined;

function format(event: string, meta: Meta): string {
  const suffix = meta ? " " + JSON.stringify(meta) : "";
  return `[auth] ${event}${suffix}`;
}

export const authLog = {
  enabled,
  info(event: string, meta?: Meta): void {
    if (!enabled) return;
    // eslint-disable-next-line no-console
    console.log(format(event, meta));
  },
  warn(event: string, meta?: Meta): void {
    if (!enabled) return;
    // eslint-disable-next-line no-console
    console.warn(format(event, meta));
  },
  error(event: string, meta?: Meta): void {
    // eslint-disable-next-line no-console
    console.error(format(event, meta));
  },
};
