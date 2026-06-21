import crypto from "crypto";
import type { CookieOptions, Request, Response } from "express";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { env } from "../env";

/**
 * Canonical session cookie names. In production the `__Host-` prefix is used
 * for hardened cookie scoping. Both names are accepted when reading so the
 * value is found regardless of environment.
 *
 * AUDIT FIX: `getUserFromRequest` previously only read the dev cookie name
 * (`session`), so cookie-based auth silently failed in production where the
 * cookie is actually named `__Host-session`.
 */
export const SESSION_COOKIE_NAMES = ["__Host-session", "session"] as const;

/** The cookie name used for *writing* the session in the current environment. */
export const SESSION_COOKIE_NAME =
  env.NODE_ENV === "production" ? "__Host-session" : "session";

/** Absolute session lifetime. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Sliding-window threshold. When an authenticated request arrives and the
 * session has less than this much life remaining, we extend it (both in the
 * DB and on the cookie). This keeps active users logged in indefinitely while
 * still expiring genuinely idle sessions after SESSION_TTL_MS of inactivity.
 */
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export function sessionCookieOptions(): CookieOptions {
  return { ...baseCookieOptions, maxAge: SESSION_TTL_MS };
}

/** Write/refresh the session cookie on the response. */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

/** Remove the session cookie (used on logout). */
export function clearSessionCookie(res: Response): void {
  // Clear under both names so dev/prod cookies are both removed.
  for (const name of SESSION_COOKIE_NAMES) {
    res.clearCookie(name, { path: "/" });
  }
}

/** Extract the raw session token from a request (cookie or Bearer header). */
export function getTokenFromRequest(req: Request): string | null {
  const cookieToken =
    req.cookies?.["__Host-session"] ?? req.cookies?.["session"];
  const token =
    cookieToken ?? req.headers.authorization?.replace("Bearer ", "");
  return token || null;
}

/**
 * AUDIT FIX (v9): Session tokens are HASHED at rest.
 *
 * We store `sha256(token)` and look sessions up by hash. The raw token is only
 * ever sent to the client in the cookie / response body.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db
    .insert(sessionsTable)
    .values({ userId, token: hashToken(token), expiresAt });
  return token; // raw token returned to caller; only the hash is persisted
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, hashToken(token)));
}

/**
 * Resolve the authenticated user for a request and transparently apply a
 * sliding-expiration refresh so active users stay logged in across refreshes.
 *
 * Returns `null` for missing / unknown / expired sessions — callers decide
 * whether that means "redirect to login" or "anonymous".
 */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const hashed = hashToken(token);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, hashed))
    .limit(1);

  if (!session) return null;

  const now = Date.now();
  // Only an *expired* session forces re-login. A valid one is honored even if
  // the client has been idle within the TTL window.
  if (session.expiresAt.getTime() <= now) return null;

  // Sliding-window refresh: extend the session when it is close to expiring.
  const remaining = session.expiresAt.getTime() - now;
  if (remaining < SESSION_TTL_MS - SESSION_REFRESH_THRESHOLD_MS) {
    const newExpiry = new Date(now + SESSION_TTL_MS);
    await db
      .update(sessionsTable)
      .set({ expiresAt: newExpiry })
      .where(eq(sessionsTable.token, hashed));
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  return user ?? null;
}
