/**
 * Auth Zod schema re-exports.
 *
 * Apps consume strict, typed form schemas via
 *   `@workspace/api-client/zod/auth`
 *
 * `LoginSchema` is the canonical name used by UI layers; it aliases the
 * generated `LoginBody` schema and tightens the rules with explicit email
 * validation and a minimum password length.
 */
import { z } from "zod";
import {
  LoginBody,
  LoginResponse,
  RegisterBody,
  ForgotPasswordBody,
} from "../generated/api";

export const LoginSchema = LoginBody.extend({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export const RegisterSchema = RegisterBody;
export type RegisterFormValues = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = ForgotPasswordBody;
export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export { LoginBody, LoginResponse, RegisterBody, ForgotPasswordBody };
