import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  getUserPermissionMap,
  invalidateRoleCache,
  invalidateUserCache,
} from "@workspace/permissions";
import { auditLog } from "../../lib/audit";
import * as repo from "./permissions.repository";
import type { Request } from "express";
import {
  VALID_PERMISSION_ROLES,
  type SetOverrideInput,
  type UpdateRolePermissionInput,
  type ValidPermissionRole,
} from "./permissions.schemas";

export function isValidRole(role: string): role is ValidPermissionRole {
  return (VALID_PERMISSION_ROLES as readonly string[]).includes(role);
}

export async function getMatrix() {
  const dbRolePerms = await repo.findAllRolePerms();
  const roles = ["ceo", "admin", "director", "team_leader", "sales"];
  const allKeys = Object.values(PERMISSIONS);

  const matrix: Record<string, Record<string, boolean>> = {};
  for (const role of roles) {
    matrix[role] = { ...DEFAULT_ROLE_PERMISSIONS[role] };
    for (const rp of dbRolePerms.filter((r) => r.role === role)) {
      matrix[role][rp.permissionKey] = rp.isEnabled;
    }
    for (const key of allKeys) {
      if (!(key in matrix[role])) matrix[role][key] = false;
    }
  }
  return { matrix };
}

export async function updateRolePermission(
  role: ValidPermissionRole,
  input: UpdateRolePermissionInput,
  currentUserId: string,
  req: Request,
): Promise<void> {
  await repo.upsertRolePerm(role, input.permissionKey, input.isEnabled, currentUserId);
  invalidateRoleCache(role);
  await auditLog({
    userId: currentUserId,
    action: "update_role_permission",
    entityType: "role_permission",
    after: { role, permissionKey: input.permissionKey, isEnabled: input.isEnabled },
    req,
  });
}

export type UserPermissionsResult =
  | {
      ok: true;
      data: {
        permissions: Record<string, boolean>;
        overrides: Awaited<ReturnType<typeof repo.findOverridesForUser>>;
        role: string;
      };
    }
  | { ok: false; reason: string };

export async function getUserPermissions(
  userId: string,
): Promise<UserPermissionsResult> {
  const user = await repo.findUserRole(userId);
  if (!user) return { ok: false, reason: "User not found" };
  const [permissions, overrides] = await Promise.all([
    getUserPermissionMap(userId, user.role),
    repo.findOverridesForUser(userId),
  ]);
  return { ok: true, data: { permissions, overrides, role: user.role } };
}

export async function setOverride(
  userId: string,
  input: SetOverrideInput,
  currentUserId: string,
  req: Request,
): Promise<void> {
  if (input.override === null) {
    await repo.deleteUserOverride(userId, input.permissionKey);
  } else {
    await repo.upsertUserOverride(
      userId,
      input.permissionKey,
      input.override,
      input.reason ?? null,
      currentUserId,
    );
  }
  invalidateUserCache(userId);
  await auditLog({
    userId: currentUserId,
    action: "set_user_permission_override",
    entityType: "user_permission_override",
    entityId: userId,
    after: {
      permissionKey: input.permissionKey,
      override: input.override,
      reason: input.reason,
    },
    req,
  });
}

export async function resetRole(
  role: ValidPermissionRole,
  currentUserId: string,
  req: Request,
): Promise<void> {
  await repo.deleteRolePerms(role);
  invalidateRoleCache(role);
  await auditLog({
    userId: currentUserId,
    action: "reset_role_permissions",
    entityType: "role_permission",
    after: { role, reset: true },
    req,
  });
}

export async function getMyPermissions(userId: string, role: string) {
  const permissions = await getUserPermissionMap(userId, role);
  return { permissions, role };
}
