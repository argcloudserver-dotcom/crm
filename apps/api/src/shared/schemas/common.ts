import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });
export const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
