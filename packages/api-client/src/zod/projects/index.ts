/**
 * Zod form schemas for the Projects feature.
 */
import * as z from "zod";
import { PROJECT_STATUSES } from "@workspace/core";

export const projectSchema = z.object({
  name: z.string().min(2, "اسم المشروع مطلوب"),
  location: z.string().optional(),
  ownerName: z.string().optional(),
  avgPrice: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  totalUnits: z.string().optional(),
  completionPercentage: z.string().optional(),
  deliveryDate: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
