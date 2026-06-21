import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import type { UploadResult } from "./upload.types";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// AUDIT FIX (v9): cap decoded pixel count to mitigate "pixel-bomb" DoS where
// a small highly-compressed image expands to billions of pixels at decode.
// 24 Mpx covers any realistic photo upload (e.g. 6000x4000).
const MAX_INPUT_PIXELS = 24_000_000;

export async function storeImage(buffer: Buffer): Promise<UploadResult> {
  // AUDIT FIX (v9): use crypto-random filename — Date.now()+Math.random() is
  // guessable and could collide under bursty load.
  const filename = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}.webp`;
  const outputPath = path.join(uploadsDir, filename);
  await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
  return { url: `/uploads/${filename}` };
}
