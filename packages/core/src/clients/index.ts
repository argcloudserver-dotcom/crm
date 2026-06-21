/**
 * Domain primitives for the Clients feature.
 *
 * Most client types come from the generated OpenAPI schemas in
 * `@workspace/api-client`. This module is the home for any additional
 * pure client-side constants shared across platforms.
 */

export const CLIENT_PAYMENT_METHODS = [
  "cash",
  "installments",
  "mortgage",
] as const;
export type ClientPaymentMethodLiteral =
  (typeof CLIENT_PAYMENT_METHODS)[number];
