import { z } from "zod";

export const plannerListQuery = z.object({
  date: z.string().optional(),
  userId: z.string().optional(),
});

export const createPlannerTaskBody = z.object({
  date: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  userId: z.string().nullable().optional(),
});

export const updatePlannerTaskBody = z.object({
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  isDone: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  position: z.number().int().optional(),
});

export const taskIdParams = z.object({ taskId: z.string().min(1) });

export type CreatePlannerTaskInput = z.infer<typeof createPlannerTaskBody>;
export type UpdatePlannerTaskInput = z.infer<typeof updatePlannerTaskBody>;
export type PlannerListQuery = z.infer<typeof plannerListQuery>;
