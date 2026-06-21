import {
  fieldErrorsToString,
  parseApiError,
  type NormalizedApiError,
} from "./parse-api-error";

export interface ToastPayload {
  title: string;
  description: string;
  variant: "destructive" | "default";
}

/**
 * Convert a thrown API error into a `{ title, description, variant }` payload
 * that the web shadcn `toast()` and mobile snackbar can both render directly.
 */
export function formatApiErrorForToast(error: unknown): ToastPayload {
  const parsed: NormalizedApiError =
    isNormalized(error) ? error : parseApiError(error);

  const fieldText = fieldErrorsToString(parsed.fieldErrors);
  const description = fieldText
    ? `${parsed.message}\n${fieldText}`.trim()
    : parsed.message;

  return {
    title: parsed.title,
    description,
    variant: "destructive",
  };
}

function isNormalized(v: unknown): v is NormalizedApiError {
  return (
    typeof v === "object" &&
    v !== null &&
    "status" in v &&
    "fieldErrors" in v &&
    "isValidation" in v
  );
}
