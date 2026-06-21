import { Router } from "express";
import passport from "passport";
import type { User } from "@workspace/db";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { created, fail, ok } from "../../shared/utils/response";
import { validateBody } from "../../shared/utils/validate";
import {
  getUserFromRequest,
  setSessionCookie,
  clearSessionCookie,
  getTokenFromRequest,
} from "../../lib/auth/session";
import { sanitizeUser } from "../../lib/sanitize";
import { authLog } from "../../lib/auth/auth-log";
import { env } from "../../lib/env";
import {
  forgotPasswordBody,
  loginBody,
  registerBody,
  resendVerificationBody,
  resetPasswordBody,
  verifyEmailBody,
} from "./auth.schemas";
import * as service from "./auth.service";
import { createRateLimiter } from "../../shared/middlewares/rateLimit";

const router = Router();

// Throttle resend-verification: max 3 codes per email/IP per 10 minutes.
// Prevents mailbox spam and bulk fake-account creation.
const resendVerificationLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 3,
  prefix: "resend-verification",
  message:
    "Too many verification code requests. Please wait a few minutes before requesting another code.",
});


// Team leaders are needed on the public registration page (so a "sales" user can
// pick their team leader before an account exists). This must NOT require auth,
// otherwise registration breaks with a 401. Only non-sensitive fields are
// returned by service.listTeamLeaders().
router.get(
  "/auth/team-leaders",
  asyncHandler(async (_req, res) => ok(res, await service.listTeamLeaders())),
);

// Public, unauthenticated approval-status probe for the "pending approval"
// screen. Polled by the client so the page can react the moment an admin
// approves the account. Returns only non-sensitive status fields.
router.get(
  "/auth/approval-status",
  asyncHandler(async (req, res) => {
    const email = typeof req.query["email"] === "string" ? req.query["email"] : "";
    if (!email) {
      return fail(res, 400, { code: "BAD_REQUEST", message: "email is required" });
    }
    return ok(res, await service.getApprovalStatus(email));
  }),
);

router.post(
  "/auth/register",
  validateBody(registerBody),
  asyncHandler(async (req, res) => {
    const result = await service.register(req.body);
    if (result.status === "conflict") {
      return fail(res, 409, {
        code: "EMAIL_EXISTS",
        message: result.reason,
      });
    }
    return created(res, { user: sanitizeUser(result.user) });
  }),
);

router.post(
  "/auth/verify-email",
  validateBody(verifyEmailBody),
  asyncHandler(async (req, res) => {
    const result = await service.verifyEmail(req.body);
    if (!result.ok) {
      return fail(res, 400, {
        code: "VERIFICATION_FAILED",
        message: result.reason,
      });
    }
    return ok(res, {
      success: true,
      message: result.alreadyVerified ? "Email already verified" : "Email verified successfully",
    });
  }),
);

// FIX: Handle web vs mobile clients differently
router.post(
  "/auth/login",
  validateBody(loginBody),
  asyncHandler(async (req, res) => {
    const result = await service.login(req.body);
    if (!result.ok) {
      return fail(res, result.status, {
        code: result.status === 401 ? "INVALID_CREDENTIALS" : "LOGIN_FAILED",
        message: result.reason,
      });
    }

    const { user, token } = result.result;
    const isMobile = req.body.client === "mobile";

    if (isMobile) {
      // Mobile clients: return token in JSON body only (no cookies)
      return ok(res, {
        user: sanitizeUser(user),
        token,
        accessToken: token,
      });
    }

    // Web clients: set HttpOnly cookie and return user only
    setSessionCookie(res, token);
    authLog.info("login.success", { userId: user.id });
    return ok(res, {
      user: sanitizeUser(user),
    });
  }),
);

router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const token = getTokenFromRequest(req);
    if (token) {
      await service.logout(token);
    }
    clearSessionCookie(res);
    return ok(res, { success: true });
  }),
);

/**
 * Session probe used by the SPA on every load to learn "who am I?".
 *
 * IMPORTANT: this endpoint intentionally returns 200 with `user: null` when
 * there is no active session, instead of 401. An unauthenticated app start is
 * the *expected* state on the login/register screens — returning 401 there
 * produced a red error in the browser console and triggered react-query
 * retries even though nothing was wrong. The frontend treats a null user as
 * "not logged in" and redirects to /login.
 *
 * A valid session is transparently refreshed (sliding expiration) so active
 * users stay logged in across refreshes.
 */
router.get(
  "/auth/me",
  asyncHandler(async (req, res) => {
    const user = await getUserFromRequest(req);

    // No session, or the account is neither active nor pending -> anonymous.
    // We return the bare user object (or null) to match the existing client
    // contract: the SPA reads `currentUser` fields directly.
    if (!user || (user.status !== "active" && user.status !== "pending")) {
      return ok(res, null);
    }

    // Refresh the cookie (only for cookie-based web sessions) so the 30-day
    // window slides forward for active users.
    const cookieToken =
      req.cookies?.["__Host-session"] ?? req.cookies?.["session"];
    if (cookieToken) {
      setSessionCookie(res, cookieToken);
    }

    return ok(res, sanitizeUser(user));
  }),
);




router.post(
  "/auth/forgot-password",
  validateBody(forgotPasswordBody),
  asyncHandler(async (req, res) => {
    await service.requestPasswordReset(req.body, req);
    // Always return success to prevent email enumeration
    return ok(res, {
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  }),
);

router.post(
  "/auth/reset-password",
  validateBody(resetPasswordBody),
  asyncHandler(async (req, res) => {
    const result = await service.resetPassword(req.body);
    if (!result.ok) {
      return fail(res, 400, {
        code: "RESET_FAILED",
        message: result.reason,
      });
    }
    return ok(res, {
      success: true,
      message: "Password has been reset successfully",
    });
  }),
);

router.post(
  "/auth/resend-verification",
  resendVerificationLimiter,
  validateBody(resendVerificationBody),
  asyncHandler(async (req, res) => {
    const result = await service.resendVerification(req.body);
    if (!result.ok) {
      return fail(res, 400, {
        code: "RESEND_FAILED",
        message: result.reason,
      });
    }
    return ok(res, {
      success: true,
      message: "Verification email has been sent",
    });
  }),
);

// ── OAuth ────────────────────────────────────────────────────────────────────
async function completeOAuthLogin(
  req: import("express").Request,
  res: import("express").Response,
  user: User,
): Promise<void> {
  const token = await service.startSessionForOAuthUser(user);
  setSessionCookie(res, token);
  
  // FIX: Use env variable for redirect URL
  const redirectUrl = env.PUBLIC_APP_URL || "/";
  res.redirect(redirectUrl);
}

// ── Mock OAuth (dev only) ───────────────────────────────────────────────────
// AUDIT FIX (v10): When AUTH_MODE=mock, /auth/<provider> short-circuits the
// real OAuth handshake and signs in a deterministic mock user. This lets the
// app boot with zero external dashboard secrets in development.
async function mockOAuthSignIn(
  req: import("express").Request,
  res: import("express").Response,
  provider: "google" | "facebook",
): Promise<void> {
  // AUDIT FIX (v12): When called while AUTH_MODE=real, return 403 with a
  // machine-readable reason field instead of 503/404.
  if (env.AUTH_MODE !== "mock") {
    return fail(res, 403, {
      code: "MOCK_AUTH_DISABLED",
      message: `Mock ${provider} sign-in is disabled when AUTH_MODE=real`,
      reason: "AUTH_MODE is not 'mock' — configure real OAuth credentials or set AUTH_MODE=mock for local dev",
    });
  }
  if (env.NODE_ENV === "production") {
    return fail(res, 403, {
      code: "MOCK_AUTH_DISABLED",
      message: `Mock ${provider} sign-in is disabled in production`,
      reason: "NODE_ENV=production forbids mock auth",
    });
  }
  const email =
    (typeof req.query["email"] === "string" && req.query["email"]) ||
    `mock-${provider}@dev.local`;
  const name =
    (typeof req.query["name"] === "string" && req.query["name"]) ||
    `Mock ${provider[0]!.toUpperCase()}${provider.slice(1)} User`;
  const user = await service.findOrCreateMockOAuthUser({ provider, email, name });
  await completeOAuthLogin(req, res, user);
}

router.get("/auth/google", (req, res, next) => {
  if (env.AUTH_MODE === "mock") {
    void mockOAuthSignIn(req, res, "google");
    return;
  }
  if (!env.GOOGLE_CLIENT_ID) {
    return fail(res, 503, {
      code: "OAUTH_UNAVAILABLE",
      message: "Google OAuth is not configured",
    });
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get("/auth/google/callback", (req, res, next) => {
  if (env.AUTH_MODE === "mock") {
    void mockOAuthSignIn(req, res, "google");
    return;
  }
  passport.authenticate(
    "google",
    { session: false },
    async (err: Error | null, user: User | false) => {
      if (err || !user) {
        const errorUrl = `${env.PUBLIC_APP_URL}/?error=oauth_failed`;
        return res.redirect(errorUrl);
      }
      await completeOAuthLogin(req, res, user);
    },
  )(req, res, next);
});

router.get("/auth/facebook", (req, res, next) => {
  if (env.AUTH_MODE === "mock") {
    void mockOAuthSignIn(req, res, "facebook");
    return;
  }
  if (!env.FACEBOOK_CLIENT_ID) {
    return fail(res, 503, {
      code: "OAUTH_UNAVAILABLE",
      message: "Facebook OAuth is not configured",
    });
  }
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  })(req, res, next);
});

router.get("/auth/facebook/callback", (req, res, next) => {
  if (env.AUTH_MODE === "mock") {
    void mockOAuthSignIn(req, res, "facebook");
    return;
  }
  passport.authenticate(
    "facebook",
    { session: false },
    async (err: Error | null, user: User | false) => {
      if (err || !user) {
        const errorUrl = `${env.PUBLIC_APP_URL}/?error=oauth_failed`;
        return res.redirect(errorUrl);
      }
      await completeOAuthLogin(req, res, user);
    },
  )(req, res, next);
});

// ── Dev-only mock email/password login ──────────────────────────────────────
// AUDIT FIX (v10): When AUTH_MODE=mock, accept ANY email/password and
// sign the caller in as a mock user. Disabled in production by env.ts.
router.post(
  "/auth/mock-login",
  asyncHandler(async (req, res) => {
    if (env.AUTH_MODE !== "mock") {
      // AUDIT FIX (v12): 403 with reason field instead of 404.
      return fail(res, 403, {
        code: "MOCK_AUTH_DISABLED",
        message: "Mock login is disabled when AUTH_MODE=real",
        reason: "AUTH_MODE is not 'mock' — use the real /auth/login endpoint or set AUTH_MODE=mock for local dev",
      });
    }
    const email =
      typeof req.body?.email === "string" && req.body.email
        ? req.body.email
        : "mock@dev.local";
    const name =
      typeof req.body?.name === "string" && req.body.name
        ? req.body.name
        : "Mock User";
    const user = await service.findOrCreateMockOAuthUser({
      provider: "mock",
      email,
      name,
    });
    const token = await service.startSessionForOAuthUser(user);
    const isMobile = req.body?.client === "mobile";
    if (isMobile) {
      return ok(res, { user: sanitizeUser(user), token, accessToken: token });
    }
    setSessionCookie(res, token);
    return ok(res, { user: sanitizeUser(user) });
  }),
);

export default router;

// Expose for callers that need session lookup directly
export { getUserFromRequest };
