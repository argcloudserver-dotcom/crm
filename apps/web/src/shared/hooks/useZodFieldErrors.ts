/**
 * AUDIT FIX (v13): React hook + helpers that turn the API's standard
 * Zod error envelope into a per-field error map for forms.
 *
 * The API returns errors as:
 *   { success: false, error: { code, message, details: { fieldErrors, formErrors } } }
 *
 * Usage:
 *   const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
 *   try { ... } catch (e) { setFieldErrors(extractFieldErrors(e)); }
 *   <Input ... /> {fieldErrors.email && <p className="text-red-600 text-xs">{fieldErrors.email}</p>}
 */
import { useState, useCallback } from "react";

export type FieldErrors = Record<string, string | undefined>;

type ApiErrorBody = {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
  };
};

/** Pull field errors out of a thrown fetch response, Error, or raw payload. */
export function extractFieldErrors(input: unknown): FieldErrors {
  const body = unwrapBody(input);
  const fe = body?.error?.details?.fieldErrors;
  if (!fe) return {};
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(fe)) {
    if (v && v.length) out[k] = v[0];
  }
  return out;
}

/** Top-level message ("Invalid request body") or the first form-level error. */
export function extractFormError(input: unknown): string | undefined {
  const body = unwrapBody(input);
  const form = body?.error?.details?.formErrors?.[0];
  return form || body?.error?.message;
}

function unwrapBody(input: unknown): ApiErrorBody | undefined {
  if (!input) return undefined;
  if (input instanceof Error) {
    const maybe = (input as Error & { body?: unknown }).body;
    if (maybe) return maybe as ApiErrorBody;
    try {
      return JSON.parse(input.message) as ApiErrorBody;
    } catch {
      return { error: { message: input.message } };
    }
  }
  if (typeof input === "object") return input as ApiErrorBody;
  return undefined;
}

export function useZodFieldErrors(): {
  fieldErrors: FieldErrors;
  formError: string | undefined;
  setFromError: (e: unknown) => void;
  clear: () => void;
} {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const setFromError = useCallback((e: unknown) => {
    setFieldErrors(extractFieldErrors(e));
    setFormError(extractFormError(e));
  }, []);

  const clear = useCallback(() => {
    setFieldErrors({});
    setFormError(undefined);
  }, []);

  return { fieldErrors, formError, setFromError, clear };
}
