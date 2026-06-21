/**
 * Domain primitives for the Projects feature.
 */

export const PROJECT_STATUSES = [
  "planning",
  "under_construction",
  "completed",
  "cancelled",
] as const;
export type ProjectStatusLiteral = (typeof PROJECT_STATUSES)[number];
