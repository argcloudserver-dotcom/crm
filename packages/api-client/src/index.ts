export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setCsrfTokenGetter,
  customFetch,
  getCsrfTokenForRequest,
  getAuthTokenForRequest,
} from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import {
  getCsrfTokenForRequest,
  getAuthTokenForRequest,
} from "./custom-fetch";

/**
 * Low-level fetch wrapper that mirrors `customFetch`'s auth + CSRF behavior
 * for callers that need a raw `Response` (multipart uploads, streaming, etc.).
 *
 * AUDIT FIX (v7): previously this was a one-line `fetch` wrapper that did NOT
 * attach the `x-csrf-token` header, so every mutating call routed through it
 * (resale photo upload, attach, delete, patch) returned 403 against the
 * CSRF-protected API.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("authorization")) {
    const token = await getAuthTokenForRequest();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  // Only mutating methods need CSRF, but attaching unconditionally is harmless.
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !headers.has("x-csrf-token")) {
    const csrf = await getCsrfTokenForRequest();
    if (csrf) headers.set("x-csrf-token", csrf);
  }

  return fetch(input, { credentials: "include", ...init, method, headers });
}
