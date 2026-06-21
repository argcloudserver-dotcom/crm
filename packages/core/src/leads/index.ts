/**
 * Domain primitives for the Leads feature.
 *
 * Pure TypeScript values & types shared between web and mobile UIs. Form /
 * Zod schemas live in `@workspace/api-client/zod/leads`; HTTP/React-Query
 * hooks live in `@workspace/api-client/hooks/leads`.
 */

/** Bilingual labels used by status pills, kanban columns, and selects. */
export const STATUS_LABELS: Record<
  string,
  { en: string; ar: string }
> = {
  new:         { en: "New",         ar: "جديد" },
  called:      { en: "Called",      ar: "تم الاتصال" },
  qualified:   { en: "Qualified",   ar: "مؤهل" },
  proposal:    { en: "Proposal",    ar: "عرض سعر" },
  negotiation: { en: "Negotiation", ar: "تفاوض" },
  won:         { en: "Won",         ar: "صفقة مكتملة" },
  lost:        { en: "Lost",        ar: "خسارة" },
};

/** Canonical ordering for pipeline / kanban views. */
export const LEAD_STATUS_ORDER: readonly string[] = [
  "new",
  "called",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

/** Allowed source values for hand-written forms (mirrors the OpenAPI enum). */
export const LEAD_SOURCES = [
  "manual",
  "import",
  "campaign",
  "referral",
  "website",
  "social",
] as const;
export type LeadSourceLiteral = (typeof LEAD_SOURCES)[number];

/** Translator function signature consumed by lead UI components. */
export type TFunc = (
  key: string,
  values?: Record<string, string | number>,
) => string;
