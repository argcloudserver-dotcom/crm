import crypto from "crypto";
import { put } from "@vercel/blob";
import type { UploadResult } from "./upload.types";

/**
 * Persist an uploaded image to Vercel Blob storage.
 *
 * Why Blob (and not local disk): the API runs as a stateless serverless
 * function in production, where the filesystem is ephemeral and NOT shared
 * between invocations. Anything written to `public/uploads` would vanish on
 * the next cold start, so every uploaded avatar / project cover / resale photo
 * would 404 shortly after upload. Blob gives us durable, CDN-backed storage
 * and returns an absolute public URL we can persist directly in the DB.
 *
 * The caller has already verified the buffer is a real image via magic-byte
 * sniffing (see upload.routes.ts), and `mimeType` is the DETECTED type.
 */

// Map the detected image mime type to a file extension for a tidy blob key.
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function storeImage(
  buffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const ext = MIME_EXTENSION[mimeType] ?? "bin";

  // Crypto-random key (un-guessable, collision-free under bursty load).
  const key = `uploads/${Date.now()}-${crypto.randomBytes(16).toString("hex")}.${ext}`;

  const blob = await put(key, buffer, {
    access: "public",
    contentType: mimeType,
  });

  // blob.url is an absolute, CDN-backed, publicly accessible URL — safe to
  // store in the DB and render directly in <img src> on the frontend.
  return { url: blob.url };
}
