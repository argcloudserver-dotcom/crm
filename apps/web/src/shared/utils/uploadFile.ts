/**
 * Shared file-upload helper.
 *
 * Why this exists: ProfilePage / ProjectsPage previously called
 * `fetch("/api/upload", { body: FormData })` directly without an
 * `x-csrf-token` header. The API enforces CSRF on every cookie-authed
 * mutating request, so those uploads returned 403.
 *
 * This helper fetches a fresh CSRF token, attaches it as a header,
 * and posts the file using the same multipart contract the API expects.
 */
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;

  inflight = fetch(`${BASE_URL}/api/csrf-token`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`CSRF HTTP ${res.status}`);
      const data = (await res.json()) as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("CSRF token missing in response");
      cachedToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function resetCsrfTokenCache(): void {
  cachedToken = null;
}

export async function uploadFile(file: File, fieldName = "file"): Promise<string> {
  const fd = new FormData();
  fd.append(fieldName, file);

  let token = await getCsrfToken();

  let res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
    headers: { "x-csrf-token": token },
  });

  // Token can expire / rotate. Retry once with a fresh token on 403.
  if (res.status === 403) {
    resetCsrfTokenCache();
    token = await getCsrfToken();
    res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: { "x-csrf-token": token },
    });
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { url?: string; data?: { url?: string } };
  const url = data.url ?? data.data?.url;
  if (!url) throw new Error("Upload response missing URL");
  return url;
}
