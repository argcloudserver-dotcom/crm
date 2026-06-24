import { useEffect } from "react";
import { setCsrfTokenGetter } from "@workspace/api-client";
import { refreshCsrfToken, useCsrfToken } from "./useCsrfToken";

/**
 * Initialize CSRF token getter for all API calls.
 * Should be called once on app load.
 */
export function useInitializeCsrf() {
  const csrfToken = useCsrfToken();

  useEffect(() => {
    setCsrfTokenGetter(() => csrfToken ?? refreshCsrfToken());
  }, [csrfToken]);
}
