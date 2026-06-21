import { z } from "zod";

// Strong password validation
const Password = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

export const RoleEnum = z.enum(["admin", "manager", "agent", "viewer"]);

// FIX: User registration - NEVER let unauthenticated users set role.
// We accept (and ignore) role / teamLeaderId fields the client UI sends so
// the request validates, but the service forces a safe default role.
export const registerBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: Password,
  phone: z.string().trim().max(32).nullable().optional(),
  // client field to differentiate between web (cookies) and mobile (Bearer tokens)
  client: z.enum(["web", "mobile"]).default("web"),
  // Accepted but ignored by the public register service (see auth.service.ts).
  role: z.string().trim().max(32).optional(),
  teamLeaderId: z.string().uuid().nullable().optional(),
});


// Separate schema for admin creating users (allows setting role)
export const adminCreateUserBody = registerBody.extend({
  role: RoleEnum.default("agent"),
  teamLeaderId: z.string().uuid().nullable().optional(),
});

export const verifyEmailBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().trim().min(1).max(20), // FIX: max length for verification codes
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128), // FIX: max length to prevent DoS
  client: z.enum(["web", "mobile"]).default("web"),
});

export const forgotPasswordBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordBody = z.object({
  token: z.string().trim().min(1).max(500), // FIX: max length for reset tokens
  password: Password,
});

export const resendVerificationBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export type RegisterInput = z.infer<typeof registerBody>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserBody>;
export type VerifyEmailInput = z.infer<typeof verifyEmailBody>;
export type LoginInput = z.infer<typeof loginBody>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBody>;
export type ResendVerificationInput = z.infer<typeof resendVerificationBody>;
