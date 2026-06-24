import { useEffect, useState } from "react";
import { authLog } from "../lib/authLog";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/**
 * Singleton CSRF token cache.
 *
 * Previously every component that called useCsrfToken() fired its own
 * GET /api/csrf-token, and each call rewrote the server-side cookie with a
 * NEW token. Components ended up holding stale tokens that no longer matched
 * the cookie → server replied 403 on the next POST.
 *
 * This module-level state guarantees a single fetch per page load (with a
 * retry on failure) and shares the resulting token across every consumer.
 */
let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;
const listeners = new Set<(t: string | null) => void>();

async function fetchCsrfToken(force = false): Promise<string | null> {
  if (cachedToken && !force) return cachedToken;
  if (inflight) return inflight;

  const url = `${BASE_URL}/api/csrf-token`;
  inflight = (async () => {
    try {
      authLog.info("[CSRF] Fetching token from:", url);
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      authLog.info("[CSRF] Response status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data?.csrfToken) throw new Error("No CSRF token in response");
      cachedToken = data.csrfToken as string;
      authLog.info("[CSRF] Token received: ✓");
      listeners.forEach((cb) => cb(cachedToken));
      return cachedToken;
    } catch (err) {
      authLog.error("[CSRF] Fetch failed:", err);
      cachedToken = null;
      listeners.forEach((cb) => cb(null));
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Force-refresh the CSRF token (e.g. after a 403 response). */
export async function refreshCsrfToken(): Promise<string | null> {
  cachedToken = null;
  return fetchCsrfToken(true);
}

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(cachedToken);

  useEffect(() => {
    const cb = (t: string | null) => setCsrfToken(t);
    listeners.add(cb);
    if (cachedToken) {
      setCsrfToken(cachedToken);
    } else {
      void fetchCsrfToken();
    }
    return () => {
      listeners.delete(cb);
    };
  }, []);

  return csrfToken;
}
