/**
 * Zod form schema for the Profile feature.
 */
import * as z from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  whatsappNumber: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
