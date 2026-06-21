import { z } from "zod";

export const leadIdParams = z.object({ leadId: z.string().min(1) });
export const delayIdParams = z.object({ delayId: z.string().min(1) });

export const createDelayBody = z.object({
  reason: z.string().min(1),
  delayUntil: z.string().min(1),
});

export const reviewDelayBody = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

export type CreateDelayInput = z.infer<typeof createDelayBody>;
export type ReviewDelayInput = z.infer<typeof reviewDelayBody>;
