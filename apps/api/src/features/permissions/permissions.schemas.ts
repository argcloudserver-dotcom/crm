import { z } from "zod";

export const VALID_PERMISSION_ROLES = [
  "admin",
  "director",
  "team_leader",
  "sales",
] as const;
export type ValidPermissionRole = (typeof VALID_PERMISSION_ROLES)[number];

export const roleParams = z.object({ role: z.string().min(1) });
export const userIdParams = z.object({ userId: z.string().min(1) });

export const updateRolePermissionBody = z.object({
  permissionKey: z.string().min(1),
  isEnabled: z.boolean(),
});

export const setOverrideBody = z.object({
  permissionKey: z.string().min(1),
  override: z.enum(["allow", "deny"]).nullable(),
  reason: z.string().nullable().optional(),
});

export type UpdateRolePermissionInput = z.infer<typeof updateRolePermissionBody>;
export type SetOverrideInput = z.infer<typeof setOverrideBody>;
