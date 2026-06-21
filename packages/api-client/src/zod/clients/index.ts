/**
 * Zod form schemas for the Clients feature.
 */
import * as z from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(5, "الهاتف مطلوب"),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  assignedSalesId: z.string().optional().or(z.literal("")),
  dealValue: z.string().optional().or(z.literal("")),
  unitNumber: z.string().optional().or(z.literal("")),
  unitType: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  paymentMethod: z.string().optional().or(z.literal("")),
  downPayment: z.string().optional().or(z.literal("")),
  contractDate: z.string().optional().or(z.literal("")),
  numberOfInstallments: z.string().optional().or(z.literal("")),
  installmentAmount: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
