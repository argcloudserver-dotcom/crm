import { useEffect } from "react";
import { customFetch, setCsrfTokenGetter } from "@workspace/api-client";
import { useCsrfToken } from "./useCsrfToken";

/**
 * Hook for authenticated API calls that automatically includes CSRF token.
 * Use this for all POST/PATCH/DELETE mutations.
 */
export function useAuthFetch() {
  const csrfToken = useCsrfToken();

  useEffect(() => {
    setCsrfTokenGetter(() => csrfToken);
  }, [csrfToken]);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    return customFetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
    });
  };
}
