import { useEffect } from "react";
import { apiFetch, setCsrfTokenGetter } from "@workspace/api-client";
import { useCsrfToken, refreshCsrfToken } from "./useCsrfToken";

/**
 * Hook for authenticated API calls that automatically includes CSRF token.
 * Use this for all POST/PATCH/DELETE mutations.
 *
 * On a 403 response (typical sign the CSRF cookie/token pair is out of sync,
 * e.g. immediately after an OAuth redirect) we force-refresh the token and
 * retry the request exactly once.
 */
export function useAuthFetch() {
  const csrfToken = useCsrfToken();

  useEffect(() => {
    setCsrfTokenGetter(() => csrfToken ?? refreshCsrfToken());
  }, [csrfToken]);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);

    const buildInit = (token: string | null): RequestInit => ({
      ...init,
      credentials: init?.credentials ?? "include",
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { "x-csrf-token": token } : {}),
      },
    });

    const initialToken = needsCsrf && !csrfToken ? await refreshCsrfToken() : csrfToken;
    let response = await apiFetch(input, buildInit(initialToken));
    if (response.status === 403) {
      const fresh = await refreshCsrfToken();
      if (fresh) {
        response = await apiFetch(input, buildInit(fresh));
      }
    }
    return response;
  };
}
