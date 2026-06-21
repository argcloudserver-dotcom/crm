import { z } from "zod";

export const projectIdParams = z.object({ projectId: z.string().min(1) });

export const createProjectBody = z.object({
  name: z.string().min(1),
  ownerName: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  avgPrice: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const updateProjectBody = z.object({
  name: z.string().optional(),
  ownerName: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  avgPrice: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectBody>;
export type UpdateProjectInput = z.infer<typeof updateProjectBody>;
