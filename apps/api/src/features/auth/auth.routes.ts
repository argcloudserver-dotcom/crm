import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
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

// ── Passport Configuration ───────────────────────────────────────────────────

if (env.AUTH_MODE === "real") {
  if (env.GOOGLE_CLIENT_ID) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          callbackURL: `${env.PUBLIC_APP_URL}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, cb) => {
          try {
            const user = await service.findOrCreateMockOAuthUser({
              provider: "google",
              email: profile.emails![0].value,
              name: profile.displayName,
            });
            return cb(null, user);
          } catch (err) {
            return cb(err as Error, false);
          }
        },
      ),
    );
  }

  if (env.FACEBOOK_CLIENT_ID) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: env.FACEBOOK_CLIENT_ID,
          clientSecret: env.FACEBOOK_CLIENT_SECRET!,
          callbackURL: `${env.PUBLIC_APP_URL}/api/auth/facebook/callback`,
          profileFields: ["id", "emails", "name"],
        },
        async (accessToken, refreshToken, profile, cb) => {
          try {
            const user = await service.findOrCreateMockOAuthUser({
              provider: "facebook",
              email: profile.emails![0].value,
              name: `${profile.name?.givenName} ${profile.name?.familyName}`,
            });
            return cb(null, user);
          } catch (err) {
            return cb(err as Error, false);
          }
        },
      ),
    );
  }
}

const router = Router();
const resendVerificationLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 3,
  prefix: "resend-verification",
  message: "Too many verification code requests.",
});

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/auth/team-leaders", asyncHandler(async (_req, res) => ok(res, await service.listTeamLeaders())));

router.get("/auth/approval-status", asyncHandler(async (req, res) => {
  const email = typeof req.query["email"] === "string" ? req.query["email"] : "";
  if (!email) return fail(res, 400, { code: "BAD_REQUEST", message: "email is required" });
  return ok(res, await service.getApprovalStatus(email));
}));

router.post("/auth/register", validateBody(registerBody), asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  if (result.status === "conflict") {
    const code =
      result.field === "username" ? "USERNAME_EXISTS" : "EMAIL_EXISTS";
    return fail(res, 409, { code, message: result.reason, field: result.field });
  }
  return created(res, { user: sanitizeUser(result.user) });
}));

router.post("/auth/verify-email", validateBody(verifyEmailBody), asyncHandler(async (req, res) => {
  const result = await service.verifyEmail(req.body);
  if (!result.ok) return fail(res, 400, { code: "VERIFICATION_FAILED", message: result.reason });
  return ok(res, { success: true, message: result.alreadyVerified ? "Email already verified" : "Email verified successfully" });
}));

router.post("/auth/login", validateBody(loginBody), asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  if (!result.ok) return fail(res, result.status, { code: result.status === 401 ? "INVALID_CREDENTIALS" : "LOGIN_FAILED", message: result.reason });
  const { user, token } = result.result;
  if (req.body.client === "mobile") return ok(res, { user: sanitizeUser(user), token, accessToken: token });
  setSessionCookie(res, token);
  authLog.info("login.success", { userId: user.id });
  return ok(res, { user: sanitizeUser(user) });
}));

router.post("/auth/logout", asyncHandler(async (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) await service.logout(token);
  clearSessionCookie(res);
  return ok(res, { success: true });
}));

router.get("/auth/me", asyncHandler(async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user || (user.status !== "active" && user.status !== "pending")) return ok(res, null);
  const cookieToken = req.cookies?.["__Host-session"] ?? req.cookies?.["session"];
  if (cookieToken) setSessionCookie(res, cookieToken);
  return ok(res, sanitizeUser(user));
}));

router.post("/auth/forgot-password", validateBody(forgotPasswordBody), asyncHandler(async (req, res) => {
  await service.requestPasswordReset(req.body, req);
  return ok(res, { success: true, message: "If the email exists, a password reset link has been sent" });
}));

router.post("/auth/reset-password", validateBody(resetPasswordBody), asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.body);
  if (!result.ok) return fail(res, 400, { code: "RESET_FAILED", message: result.reason });
  return ok(res, { success: true, message: "Password has been reset successfully" });
}));

router.post("/auth/resend-verification", resendVerificationLimiter, validateBody(resendVerificationBody), asyncHandler(async (req, res) => {
  const result = await service.resendVerification(req.body);
  if (!result.ok) return fail(res, 400, { code: "RESEND_FAILED", message: result.reason });
  return ok(res, { success: true, message: "Verification email has been sent" });
}));

// ── OAuth Handlers ──────────────────────────────────────────────────────────

async function completeOAuthLogin(req: any, res: any, user: User): Promise<void> {
  const baseUrl = env.PUBLIC_APP_URL || "/";
  // SECURITY FIX: do not issue a session token for the main system unless
  // the account is active. Pending / rejected / suspended OAuth users are
  // redirected to the pending-approval page instead of the dashboard.
  if (user.status === "rejected") {
    return res.redirect(`${baseUrl}/login?error=account_rejected`);
  }
  if (user.status === "suspended") {
    return res.redirect(`${baseUrl}/login?error=account_suspended`);
  }
  if (user.status !== "active") {
    return res.redirect(`${baseUrl}/pending-approval?email=${encodeURIComponent(user.email)}`);
  }
  const token = await service.startSessionForOAuthUser(user);
  setSessionCookie(res, token);
  res.redirect(`${baseUrl}/home`);
}

async function mockOAuthSignIn(req: any, res: any, provider: "google" | "facebook"): Promise<void> {
  if (env.AUTH_MODE !== "mock") return fail(res, 403, { code: "MOCK_AUTH_DISABLED", message: `Mock ${provider} disabled.` });
  const email = (typeof req.query["email"] === "string" && req.query["email"]) || `mock-${provider}@dev.local`;
  const name = (typeof req.query["name"] === "string" && req.query["name"]) || `Mock ${provider} User`;
  const user = await service.findOrCreateMockOAuthUser({ provider, email, name });
  await completeOAuthLogin(req, res, user);
}

router.get("/auth/google", (req, res, next) => {
  if (env.AUTH_MODE === "mock") return mockOAuthSignIn(req, res, "google");
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err: Error | null, user: User | false) => {
    if (err || !user) return res.redirect(`${env.PUBLIC_APP_URL}/?error=oauth_failed`);
    await completeOAuthLogin(req, res, user);
  })(req, res, next);
});

router.get("/auth/facebook", (req, res, next) => {
  if (env.AUTH_MODE === "mock") return mockOAuthSignIn(req, res, "facebook");
  passport.authenticate("facebook", { scope: ["email"], session: false })(req, res, next);
});

router.get("/auth/facebook/callback", (req, res, next) => {
  passport.authenticate("facebook", { session: false }, async (err: Error | null, user: User | false) => {
    if (err || !user) return res.redirect(`${env.PUBLIC_APP_URL}/?error=oauth_failed`);
    await completeOAuthLogin(req, res, user);
  })(req, res, next);
});

router.post("/auth/mock-login", asyncHandler(async (req, res) => {
  if (env.AUTH_MODE !== "mock") return fail(res, 403, { code: "MOCK_AUTH_DISABLED", message: "Mock login disabled." });
  const email = (typeof req.body?.email === "string" && req.body.email) || "mock@dev.local";
  const user = await service.findOrCreateMockOAuthUser({ provider: "mock", email, name: "Mock User" });
  const token = await service.startSessionForOAuthUser(user);
  if (req.body?.client === "mobile") return ok(res, { user: sanitizeUser(user), token, accessToken: token });
  setSessionCookie(res, token);
  return ok(res, { user: sanitizeUser(user) });
}));

export default router;
export { getUserFromRequest };