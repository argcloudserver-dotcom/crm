import { z } from "zod";

// File payloads are validated by multer (mime + size) in upload.routes.ts.
// Response shape is mirrored here for type-safe consumers.
export const uploadResponse = z.object({
  url: z.string().min(1),
});
export type UploadResponse = z.infer<typeof uploadResponse>;
