import { z } from "zod";

export const notificationIdParams = z.object({
  notificationId: z.string().min(1),
});
