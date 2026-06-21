import { z } from "zod";

export const clientIdParams = z.object({ clientId: z.string().min(1) });

export const listClientsQuery = z.object({
  search: z.string().optional(),
});

const dealFields = {
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  dealValue: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assignedSalesId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  unitNumber: z.string().nullable().optional(),
  unitType: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  downPayment: z.string().nullable().optional(),
  contractDate: z.string().nullable().optional(),
  numberOfInstallments: z.number().int().nullable().optional(),
  installmentAmount: z.string().nullable().optional(),
};

// تم تعديل الأسماء هنا لتطابق ملف الـ routes
export const ClientCreateSchema = z.object({ ...dealFields, name: z.string().min(1) });
export const ClientUpdateSchema = z.object(dealFields);

export type CreateClientInput = z.infer<typeof ClientCreateSchema>;
export type UpdateClientInput = z.infer<typeof ClientUpdateSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuery>;