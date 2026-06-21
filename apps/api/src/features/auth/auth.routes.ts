import { Router } from "express";
import passport from "passport";
import type { User } from "@workspace/db";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { created, fail, ok } from "../../shared/utils/response";
import { validateBody } from "../../shared/utils/validate";
import { getUserFromRequest } from "../../lib/auth/session";
import { sanitizeUser } from "../../lib/sanitize";
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

const router = Router();

// FIX: Use __Host- prefix in production for enhanced cookie security
const cookieBase = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const sessionCookieName = env.NODE_ENV === "production" ? "__Host-session" : "session";

const sessionCookieOptions = {
  ...cookieBase,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Team leaders are needed on the public registration page (so a "sales" user can
// pick their team leader before an account exists). This must NOT require auth,
// otherwise registration breaks with a 401. Only non-sensitive fields are
// returned by service.listTeamLeaders().
router.get(
  "/auth/team-leaders",
  asyncHandler(async (_req, res) => ok(res, await service.listTeamLeaders())),
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
    res.cookie(sessionCookieName, token, sessionCookieOptions);
    return ok(res, {
      user: sanitizeUser(user),
    });
  }),
);

router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[sessionCookieName] || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await service.logout(token);
    }
    res.clearCookie(sessionCookieName, { path: "/" });
    return ok(res, { success: true });
  }),
);

router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => ok(res, sanitizeUser(req.currentUser!))),
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
  res.cookie(sessionCookieName, token, sessionCookieOptions);
  
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
    res.cookie(sessionCookieName, token, sessionCookieOptions);
    return ok(res, { user: sanitizeUser(user) });
  }),
);

export default router;

// Expose for callers that need session lookup directly
export { getUserFromRequest };
