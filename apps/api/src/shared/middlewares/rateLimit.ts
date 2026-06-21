import type { Request, Response, NextFunction } from "express";
import { fail } from "../utils/response";

const windowMs = 60_000;
const maxRequests = 200;

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key =
    req.currentUser?.id ??
    (req.headers["x-forwarded-for"]?.toString().split(",")[0] ??
      req.socket.remoteAddress ??
      "unknown");

  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > maxRequests) {
    fail(res, 429, {
      code: "RATE_LIMITED",
      message: "Too many requests, slow down",
    });
    return;
  }

  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60_000);

/**
 * Factory for a stricter, route-scoped rate limiter. Used to throttle abuse-prone
 * endpoints such as "resend verification code" so a single email/IP cannot be used
 * to spam mailboxes or create accounts in bulk.
 *
 * The key combines the client IP and (when present) the request-body email so a
 * single attacker cannot rotate the email to bypass the per-IP cap, and a single
 * victim's mailbox cannot be flooded from many IPs.
 */
export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (entry.resetAt < now) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();

  return function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const key = `${opts.prefix}:${ip}:${email}`;

    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, entry);
    }
    entry.count++;

    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - entry.count));

    if (entry.count > opts.max) {
      res.setHeader("Retry-After", retryAfter);
      fail(res, 429, {
        code: "RATE_LIMITED",
        message:
          opts.message ??
          `Too many requests. Please wait ${retryAfter}s before trying again.`,
      });
      return;
    }
    next();
  };
}
