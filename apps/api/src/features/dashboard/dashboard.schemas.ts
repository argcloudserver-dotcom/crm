import { z } from "zod";

// Dashboard endpoints are read-only and take no inputs.
// This file exists for layer-consistency across API features.
export const emptyQuery = z.object({}).strict();
export type EmptyQuery = z.infer<typeof emptyQuery>;
