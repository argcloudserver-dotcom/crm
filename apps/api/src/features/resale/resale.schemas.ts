import { z } from "zod";

export const unitIdParams = z.object({
  unitId: z.string().uuid("Invalid unit ID"),
});

export const photoParams = z.object({
  unitId: z.string().uuid("Invalid unit ID"),
  photoId: z.string().uuid("Invalid photo ID"),
});

export const listResaleQuery = z.object({
  projectId: z.string().uuid().optional(),
  unitType: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const createResaleBody = z.object({
  projectName: z.string().trim().min(1).max(200),
  projectId: z.string().uuid().nullable().optional(),
  area: z.string().trim().max(32).nullable().optional(),
  price: z.string().trim().max(32).nullable().optional(),
  floor: z.number().int().nullable().optional(),
  unitType: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(5_000).nullable().optional(),
  ownerName: z.string().trim().max(120).nullable().optional(),
  ownerPhone: z.string().trim().max(32).nullable().optional(),
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .nullable()
    .optional(),
  ownerNotes: z.string().trim().max(5_000).nullable().optional(),
  isOwnerPhoneHidden: z.boolean().optional(),
  isOwnerEmailHidden: z.boolean().optional(),
  // Accept either an absolute URL (https://…) or a server-relative path
  // produced by /api/upload (e.g. "/uploads/abc.webp").
  photos: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(2_000)
        .refine(
          (s) => /^https?:\/\//i.test(s) || s.startsWith("/"),
          "Invalid photo URL",
        ),
    )
    .optional(),

});

export const updateResaleBody = z.object({
  projectId: z.string().uuid().nullable().optional(),
  projectName: z.string().trim().max(200).optional(),
  area: z.string().trim().max(32).nullable().optional(),
  price: z.string().trim().max(32).nullable().optional(),
  floor: z.number().int().nullable().optional(),
  unitType: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(5_000).nullable().optional(),
  ownerName: z.string().trim().max(120).nullable().optional(),
  ownerPhone: z.string().trim().max(32).nullable().optional(),
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .nullable()
    .optional(),
  ownerNotes: z.string().trim().max(5_000).nullable().optional(),
  isOwnerPhoneHidden: z.boolean().optional(),
  isOwnerEmailHidden: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const assignResaleBody = z.object({
  assignedTo: z.string().uuid().nullable(),
});

export const createPhotoBody = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine(
      (s) => /^https?:\/\//i.test(s) || s.startsWith("/"),
      "Invalid photo URL",
    ),
  caption: z.string().trim().max(500).nullable().optional(),
});


export type CreateResaleInput = z.infer<typeof createResaleBody>;
export type UpdateResaleInput = z.infer<typeof updateResaleBody>;
export type ListResaleQuery = z.infer<typeof listResaleQuery>;
export type AssignResaleInput = z.infer<typeof assignResaleBody>;
export type CreatePhotoInput = z.infer<typeof createPhotoBody>;
