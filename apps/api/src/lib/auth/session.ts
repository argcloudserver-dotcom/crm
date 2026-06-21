import crypto from "crypto";
import type { Request } from "express";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Canonical session cookie names. In production the `__Host-` prefix is used
 * for hardened cookie scoping (set in auth.routes.ts). Both names are accepted
 * when reading so the value is found regardless of environment.
 *
 * AUDIT FIX: `getUserFromRequest` previously only read the dev cookie name
 * (`session`), so cookie-based auth silently failed in production where the
 * cookie is actually named `__Host-session`.
 */
export const SESSION_COOKIE_NAMES = ["__Host-session", "session"] as const;

/**
 * AUDIT FIX (v9): Session tokens are now HASHED at rest.
 *
 * Previously, `sessionsTable.token` stored the raw 32-byte random token
 * exactly as it was issued to the client. Any read access to the DB
 * (backup leak, replica compromise, SQL injection elsewhere) handed the
 * attacker every active session.
 *
 * We now store `sha256(token)` and look sessions up by hash. The raw
 * token is only ever sent to the client in the cookie / response body.
 * Existing rows written under the old scheme will simply not match and
 * users will be asked to log in again — acceptable for a security fix.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db
    .insert(sessionsTable)
    .values({ userId, token: hashToken(token), expiresAt });
  return token; // raw token returned to caller; only the hash is persisted
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, hashToken(token)));
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const cookieToken =
    req.cookies?.["__Host-session"] ?? req.cookies?.["session"];
  const token = cookieToken ?? req.headers.authorization?.replace("Bearer ", "");

  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, hashToken(token)))
    .limit(1);

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  return user ?? null;
}
