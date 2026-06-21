/**
 * Zod form schemas for the Leads feature.
 *
 * Canonical home for client-side validation schemas + the form-value types
 * inferred from them. Reused by web modals/pages and the upcoming mobile
 * lead editor screens.
 */
import * as z from "zod";
import { LEAD_SOURCES } from "@workspace/core";

export const activitySchema = z.object({
  type: z.enum(["call", "meeting", "email", "message", "note"]),
  notes: z.string().min(1),
  outcome: z.string().optional(),
  nextAction: z.string().optional(),
  durationMinutes: z.coerce.number().optional(),
});
export type ActivityFormValues = z.infer<typeof activitySchema>;

export const convertDealSchema = z.object({
  dealValue: z.string().optional(),
  unitNumber: z.string().optional(),
  unitType: z
    .enum([
      "apartment",
      "villa",
      "duplex",
      "penthouse",
      "townhouse",
      "commercial",
    ])
    .optional(),
  area: z.string().optional(),
  paymentMethod: z.enum(["cash", "installments", "mortgage"]).optional(),
  downPayment: z.string().optional(),
  contractDate: z.string().optional(),
  numberOfInstallments: z.coerce.number().optional(),
  installmentAmount: z.string().optional(),
  projectId: z.string().optional(),
  assignedSalesId: z.string().optional(),
});
export type ConvertDealFormValues = z.infer<typeof convertDealSchema>;

export const editLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  deadline: z.string().optional(),
  nextActionAt: z.string().optional(),
});
export type EditLeadFormValues = z.infer<typeof editLeadSchema>;
