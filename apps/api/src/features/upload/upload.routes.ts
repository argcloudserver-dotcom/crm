import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { fail, ok } from "../../shared/utils/response";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { storeImage } from "./upload.service";

// AUDIT FIX (v9): Allow-list keyed by the DETECTED mime type (from magic
// bytes), not the client-supplied `Content-Type`.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Coarse pre-filter on the client-supplied type to reject obvious
    // non-images early. The authoritative check is the magic-byte sniff
    // performed AFTER the upload completes (see below).
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

router.post("/upload", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      // AUDIT FIX: surface 413 for "too large", 400 otherwise.
      const isTooLarge =
        (err as { code?: string }).code === "LIMIT_FILE_SIZE";
      fail(res, isTooLarge ? 413 : 400, { message: err.message });
      return;
    }
    void asyncHandler(async (r, s) => {
      if (!r.file) return fail(s, 400, { message: "No file uploaded" });

      // AUDIT FIX (v9): verify the file is actually an image by sniffing
      // its magic bytes. The browser-supplied mimetype is not trustworthy.
      const detected = await fileTypeFromBuffer(r.file.buffer);
      if (!detected || !ALLOWED_MIME.has(detected.mime)) {
        return fail(s, 415, {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Uploaded file is not a supported image",
        });
      }

      const result = await storeImage(r.file.buffer);
      return ok(s, result);
    })(req, res, next);
  });
});

export default router;
