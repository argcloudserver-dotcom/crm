/**
 * Configurable auth diagnostics logger for the web app (#4).
 *
 * Keeps local development consoles clean while production keeps useful
 * diagnostics. Controlled by the `VITE_AUTH_DEBUG` env var:
 *
 *   VITE_AUTH_DEBUG=true   -> always log auth diagnostics
 *   VITE_AUTH_DEBUG=false  -> never log (except hard errors)
 *   (unset)                -> log only in production builds
 *
 * `error` always logs — a real auth failure should never be silently dropped.
 */
const raw = import.meta.env.VITE_AUTH_DEBUG as string | undefined;

export const authLogEnabled =
  raw === undefined ? import.meta.env.PROD : raw === "true";

export const authLog = {
  enabled: authLogEnabled,
  info(...args: unknown[]): void {
    if (!authLogEnabled) return;
    // eslint-disable-next-line no-console
    console.log("[auth]", ...args);
  },
  warn(...args: unknown[]): void {
    if (!authLogEnabled) return;
    // eslint-disable-next-line no-console
    console.warn("[auth]", ...args);
  },
  error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error("[auth]", ...args);
  },
};
