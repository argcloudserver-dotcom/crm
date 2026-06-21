import { z } from "zod";

export const reportsQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
});

export type ReportsQuery = z.infer<typeof reportsQuery>;
