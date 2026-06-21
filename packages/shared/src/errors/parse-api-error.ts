/**
 * Normalised API error shape consumed by the UI.
 *
 * Produced by `parseApiError` from any thrown value (ApiError, plain Error,
 * Response, or unknown). Both apps then render it via toast helpers.
 */
export interface NormalizedApiError {
  /** HTTP status (0 when unknown / network error). */
  status: number;
  /** Short, human-readable headline (e.g. "Validation failed"). */
  title: string;
  /** Full error description for the toast body / inline banner. */
  message: string;
  /** Per-field validation messages keyed by field path. */
  fieldErrors: Record<string, string[]>;
  /** True for Zod / 4xx validation responses. */
  isValidation: boolean;
  /** True when the request never reached the server (offline, DNS, abort). */
  isNetwork: boolean;
  /** Original thrown value, preserved for logging. */
  cause: unknown;
}

interface ApiErrorLike {
  name?: string;
  status?: number;
  statusText?: string;
  message?: string;
  data?: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean);
  return out.length ? out : undefined;
}

/**
 * Extract `{ field: [msg, ...] }` from common server payload shapes:
 *
 *  - Zod / Hono `{ issues: [{ path: ["email"], message: "..." }] }`
 *  - Fastify / NestJS `{ errors: { email: ["..."] } }`
 *  - Spring style `{ fieldErrors: [{ field, message }] }`
 */
function extractFieldErrors(data: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!isObject(data)) return out;

  const issues = data.issues;
  if (Array.isArray(issues)) {
    for (const raw of issues) {
      if (!isObject(raw)) continue;
      const path = Array.isArray(raw.path)
        ? raw.path
            .map((p) => (typeof p === "string" || typeof p === "number" ? String(p) : ""))
            .filter(Boolean)
            .join(".")
        : asString(raw.path) ?? "_";
      const msg = asString(raw.message) ?? "Invalid value";
      (out[path] ??= []).push(msg);
    }
  }

  const errors = data.errors;
  if (isObject(errors)) {
    for (const [key, value] of Object.entries(errors)) {
      const arr = asStringArray(value);
      if (arr) (out[key] ??= []).push(...arr);
      else {
        const single = asString(value);
        if (single) (out[key] ??= []).push(single);
      }
    }
  }

  const fieldErrors = data.fieldErrors;
  if (Array.isArray(fieldErrors)) {
    for (const raw of fieldErrors) {
      if (!isObject(raw)) continue;
      const field = asString(raw.field) ?? "_";
      const msg = asString(raw.message) ?? "Invalid value";
      (out[field] ??= []).push(msg);
    }
  }

  return out;
}

function titleForStatus(status: number, isValidation: boolean): string {
  if (isValidation) return "Validation failed";
  if (status === 0) return "Network error";
  if (status === 401) return "Not signed in";
  if (status === 403) return "Permission denied";
  if (status === 404) return "Not found";
  if (status === 409) return "Conflict";
  if (status === 429) return "Too many requests";
  if (status >= 500) return "Server error";
  if (status >= 400) return "Request failed";
  return "Something went wrong";
}

function messageFromData(data: unknown): string | undefined {
  if (typeof data === "string") return asString(data);
  if (!isObject(data)) return undefined;
  return (
    asString(data.detail) ??
    asString(data.message) ??
    asString(data.error_description) ??
    asString(data.error) ??
    asString(data.title)
  );
}

function isAbortLike(err: unknown): boolean {
  return (
    isObject(err) &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  );
}

function isNetworkLike(err: unknown): boolean {
  if (isAbortLike(err)) return true;
  if (!(err instanceof Error)) return false;
  // Browsers throw TypeError("Failed to fetch") / RN throws Network request failed.
  return (
    err.name === "TypeError" &&
    /fetch|network|failed/i.test(err.message)
  );
}

/**
 * Normalise any thrown value from an API call into a UI-friendly shape.
 * Safe to call on `unknown` — never throws.
 */
export function parseApiError(error: unknown): NormalizedApiError {
  if (isNetworkLike(error)) {
    return {
      status: 0,
      title: titleForStatus(0, false),
      message: "Unable to reach the server. Check your connection and try again.",
      fieldErrors: {},
      isValidation: false,
      isNetwork: true,
      cause: error,
    };
  }

  // Duck-type ApiError from @workspace/api-client without importing it
  // (keeps `@workspace/shared/errors` runtime-agnostic).
  if (isObject(error) && (error as ApiErrorLike).name === "ApiError") {
    const e = error as ApiErrorLike;
    const status = typeof e.status === "number" ? e.status : 0;
    const fieldErrors = extractFieldErrors(e.data);
    const isValidation = status === 400 || status === 422 || Object.keys(fieldErrors).length > 0;
    const message =
      messageFromData(e.data) ??
      asString(e.message) ??
      `HTTP ${status}${e.statusText ? ` ${e.statusText}` : ""}`;
    return {
      status,
      title: titleForStatus(status, isValidation),
      message,
      fieldErrors,
      isValidation,
      isNetwork: false,
      cause: error,
    };
  }

  if (error instanceof Error) {
    return {
      status: 0,
      title: "Something went wrong",
      message: error.message || "Unknown error",
      fieldErrors: {},
      isValidation: false,
      isNetwork: false,
      cause: error,
    };
  }

  return {
    status: 0,
    title: "Something went wrong",
    message: asString(error) ?? "Unknown error",
    fieldErrors: {},
    isValidation: false,
    isNetwork: false,
    cause: error,
  };
}

/** Flatten field errors into a single newline-separated string. */
export function fieldErrorsToString(fieldErrors: Record<string, string[]>): string {
  return Object.entries(fieldErrors)
    .map(([field, msgs]) => (field && field !== "_" ? `${field}: ${msgs.join(", ")}` : msgs.join(", ")))
    .join("\n");
}
