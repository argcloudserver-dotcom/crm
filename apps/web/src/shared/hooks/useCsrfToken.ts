import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const url = `${BASE_URL}/api/csrf-token`;
    console.log("[CSRF] Fetching token from:", url);

    fetch(url, { credentials: "include" })
      .then((res) => {
        console.log("[CSRF] Response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.csrfToken) {
          throw new Error("No CSRF token in response");
        }
        console.log("[CSRF] Token received: ✓");
        setCsrfToken(data.csrfToken);
      })
      .catch((err) => {
        console.error("[CSRF] Fetch failed:", err);
      });
  }, []);

  return csrfToken;
}

