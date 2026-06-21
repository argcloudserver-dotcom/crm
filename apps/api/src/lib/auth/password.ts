import bcrypt from "bcryptjs";

// AUDIT FIX (v13): Use cost 12 in production for stronger password hashes;
// keep 10 in dev/test to avoid slow test runs.
const COST = process.env["NODE_ENV"] === "production" ? 12 : 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

