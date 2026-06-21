/**
 * Zod form schemas for the Resale feature.
 *
 * Used by the Add/Edit unit dialogs on web and the upcoming mobile
 * marketplace editor screens.
 */
import * as z from "zod";

export const resaleSchema = z.object({
  projectName: z.string().min(2),
  unitType: z.string().optional(),
  area: z.string().optional(),
  price: z.string().optional(),
  floor: z.coerce.number().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerNotes: z.string().optional(),
  description: z.string().optional(),
  isOwnerPhoneHidden: z.boolean().default(false),
  isOwnerEmailHidden: z.boolean().default(false),
});

export type ResaleFormValues = z.infer<typeof resaleSchema>;
