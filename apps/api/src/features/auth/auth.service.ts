import crypto from "crypto";
import type { Request } from "express";
import { sanitizeUser } from "../../lib/sanitize";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { createSession, deleteSession } from "../../lib/auth/session";
import {
  sendAdminNewUserAlert,
  sendPasswordResetLink,
  sendVerificationCode,
  sendWelcomePendingApproval,
} from "../../lib/email/auth-emails";
import { logger } from "../../lib/logger";
import { getAppUrl } from "../../shared/utils/getAppUrl";
import * as repo from "./auth.repository";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schemas";
import { VALID_ROLES, type AuthUser, type LoginResult, type ValidRole } from "./auth.types";

function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type RegisterResult =
  | { status: "created" | "resent"; user: Record<string, unknown> }
  | { status: "conflict"; reason: string; field?: "email" | "username" };

export async function listTeamLeaders() {
  try {
    return await repo.findActiveTeamLeaders();
  } catch {
    return [];
  }
}

export type ApprovalStatusResult =
  | { found: true; status: string; emailVerified: boolean }
  | { found: false };

/**
 * Lightweight, unauthenticated status probe used by the "pending approval"
 * screen to poll whether an admin has approved the account yet. Returns only
 * non-sensitive status fields.
 */
export async function getApprovalStatus(
  email: string,
): Promise<ApprovalStatusResult> {
  const user = await repo.findByEmail(email);
  if (!user) return { found: false };
  return {
    found: true,
    status: user.status,
    emailVerified: !!user.emailVerifiedAt,
  };
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  // AUDIT FIX (v8): the public `registerBody` schema is `.strict()` and does
  // NOT expose `role` / `teamLeaderId` (anti-privilege-escalation). The old
  // code still tried to read them off `input`, which was always undefined
  // at runtime and produced two TS errors. New users always register as
  // `sales`; admin-created users go through a separate admin endpoint.
  const userRole: ValidRole = VALID_ROLES.includes("sales" as ValidRole)
    ? ("sales" as ValidRole)
    : (VALID_ROLES[0] as ValidRole);

  // Username (name) uniqueness check — returned BEFORE issuing OTP so the
  // user can correct the form.
  const nameTaken = await repo.findByName(input.name);
  if (nameTaken) {
    return {
      status: "conflict",
      reason: "Username is already taken.",
      field: "username",
    };
  }

  const existing = await repo.findByEmail(input.email);
  if (existing) {
    if (existing.emailVerifiedAt) {
      return {
        status: "conflict",
        reason: "Email is already in use.",
        field: "email",
      };
    }
    const verifyCode = generateVerifyCode();
    const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await repo.updateUser(existing.id, {
      verifyToken: verifyCode,
      verifyTokenExpires,
    });
    sendVerificationCode(existing.email, existing.name, verifyCode).catch(
      (err) => logger.error({ err }, "Failed to resend verification email"),
    );
    return { status: "resent", user: sanitizeUser(existing) };
  }

  const passwordHash = await hashPassword(input.password);
  const verifyCode = generateVerifyCode();
  const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

  const user = await repo.insertUser({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    phone: input.phone ?? null,
    // SECURITY FIX: new accounts MUST start as pending until an admin
    // approves them. Previously this was "active", which allowed users to
    // access the CRM immediately after verifying email.
    status: "pending",
    role: userRole,
    teamLeaderId: null,
    verifyToken: verifyCode,
    verifyTokenExpires,
  });

  sendVerificationCode(user.email, user.name, verifyCode).catch((err) =>
    logger.error({ err }, "Failed to send verification email"),
  );

  return { status: "created", user: sanitizeUser(user) };
}

export type VerifyResult =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: string };

export async function verifyEmail(
  input: VerifyEmailInput,
): Promise<VerifyResult> {
  const user = await repo.findByEmail(input.email);
  if (!user) return { ok: false, reason: "Invalid code" };
  if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

  // Distinguish "expired" from "wrong code" so the UI can show a specific
  // message and prompt the user to request a fresh code.
  if (user.verifyTokenExpires && user.verifyTokenExpires < new Date()) {
    return {
      ok: false,
      reason: "Your verification code has expired. Please request a new code.",
    };
  }
  if (!user.verifyToken || user.verifyToken !== input.code) {
    return {
      ok: false,
      reason: "That verification code is invalid. Please check the code and try again.",
    };
  }

  await repo.updateUser(user.id, {
    emailVerifiedAt: new Date(),
    verifyToken: null,
    verifyTokenExpires: null,
  });

  sendWelcomePendingApproval(user.email, user.name).catch((err) =>
    logger.error({ err }, "Failed to send welcome email"),
  );

  void notifyAdminsOfNewUser(user).catch((err) =>
    logger.error({ err }, "Failed to send admin notifications"),
  );

  return { ok: true, alreadyVerified: false };
}

async function notifyAdminsOfNewUser(user: AuthUser): Promise<void> {
  const admins = await repo.findActiveAdmins();
  if (admins.length === 0) return;
  await repo.insertAdminNotifications(admins, {
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await sendAdminNewUserAlert(
    admins.map((a) => a.email),
    user.name,
    user.email,
    user.role,
  );
}

export type AuthLoginResult =
  | { ok: true; result: LoginResult }
  | { ok: false; status: number; reason: string };

export async function login(input: LoginInput): Promise<AuthLoginResult> {
  const user = await repo.findByEmail(input.email.trim());
  if (!user || !user.passwordHash) {
    return { ok: false, status: 401, reason: "Invalid credentials" };
  }
  const valid = await verifyPassword(input.password.trim(), user.passwordHash);
  if (!valid) {
    return { ok: false, status: 401, reason: "Invalid credentials" };
  }
  if (!user.emailVerifiedAt) {
    return {
      ok: false,
      status: 403,
      reason:
        "Please verify your email before logging in. Check your inbox for the verification code.",
    };
  }
  if (user.status === "rejected") {
    return {
      ok: false,
      status: 403,
      reason: "Your account application was rejected. Please contact an administrator.",
    };
  }
  if (user.status === "suspended") {
    return {
      ok: false,
      status: 403,
      reason: "Your account has been suspended. Please contact an administrator.",
    };
  }
  if (user.status === "pending") {
    // SECURITY FIX: do NOT issue a session token for the main system. We
    // return a special 403 the frontend uses to route to the pending page.
    return {
      ok: false,
      status: 403,
      reason: "Your account is pending admin approval.",
    };
  }
  const token = await createSession(user.id);
  return { ok: true, result: { user: sanitizeUser(user), token } };
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) await deleteSession(token);
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  req: Request,
): Promise<void> {
  const user = await repo.findByEmail(input.email);
  if (!user) return;
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
  await repo.updateUser(user.id, { resetToken, resetTokenExpires });
  const resetUrl = `${getAppUrl(req)}/reset-password?token=${resetToken}`;
  sendPasswordResetLink(user.email, user.name, resetUrl).catch((err) =>
    logger.error({ err }, "Failed to send password reset email"),
  );
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  const user = await repo.findByResetToken(input.token);
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return { ok: false, reason: "Invalid or expired reset token" };
  }
  const passwordHash = await hashPassword(input.password);
  await repo.updateUser(user.id, {
    passwordHash,
    resetToken: null,
    resetTokenExpires: null,
  });
  return { ok: true };
}

export type ResendResult = { ok: true } | { ok: false; reason: string };

export async function resendVerification(
  input: ResendVerificationInput,
): Promise<ResendResult> {
  const user = await repo.findByEmail(input.email);
  if (!user) return { ok: false, reason: "No account found with this email" };
  if (user.emailVerifiedAt) return { ok: false, reason: "Email already verified" };

  const verifyCode = generateVerifyCode();
  const verifyTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
  await repo.updateUser(user.id, { verifyToken: verifyCode, verifyTokenExpires });
  sendVerificationCode(user.email, user.name, verifyCode).catch((err) =>
    logger.error({ err }, "Failed to resend verification email"),
  );
  return { ok: true };
}

export async function startSessionForOAuthUser(
  user: AuthUser,
): Promise<string> {
  return createSession(user.id);
}

/**
 * AUDIT FIX (v10): Mock OAuth / mock-login support.
 *
 * Used only when `AUTH_MODE=mock` (dev). Finds-or-creates a user keyed by
 * the supplied email so repeated logins land on the same row. The user is
 * always `active` and email-verified so it can immediately use the app.
 */
export async function findOrCreateMockOAuthUser(input: {
  provider: "google" | "facebook" | "mock";
  email: string;
  name: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await repo.findByEmail(email);
  if (existing) return existing;
  return repo.insertUser({
    name: input.name,
    email,
    oauthProvider: input.provider === "mock" ? "google" : input.provider,
    oauthId: `mock-${input.provider}-${email}`,
    emailVerifiedAt: new Date(),
    // SECURITY FIX: OAuth signups must also wait for admin approval.
    status: "pending",
    role: "sales",
  });
}
