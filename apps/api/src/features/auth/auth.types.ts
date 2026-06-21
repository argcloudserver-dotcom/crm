import type { User } from "@workspace/db";

export interface LoginResult {
  user: Record<string, unknown>;
  token: string;
}

export type ValidRole = "ceo" | "admin" | "director" | "team_leader" | "sales";

export const VALID_ROLES: readonly ValidRole[] = [
  "ceo",
  "admin",
  "director",
  "team_leader",
  "sales",
] as const;

export type AuthUser = User;
