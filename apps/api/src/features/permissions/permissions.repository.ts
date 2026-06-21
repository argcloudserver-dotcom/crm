import {
  db,
  rolePermissionsTable,
  userPermissionOverridesTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { ValidPermissionRole } from "./permissions.schemas";

export async function findAllRolePerms() {
  return db.select().from(rolePermissionsTable);
}

export async function upsertRolePerm(
  role: ValidPermissionRole,
  permissionKey: string,
  isEnabled: boolean,
  updatedBy: string,
) {
  await db
    .insert(rolePermissionsTable)
    .values({ role, permissionKey, isEnabled, updatedBy })
    .onConflictDoUpdate({
      target: [rolePermissionsTable.role, rolePermissionsTable.permissionKey],
      set: { isEnabled, updatedBy, updatedAt: new Date() },
    });
}

export async function deleteRolePerms(role: ValidPermissionRole) {
  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role, role));
}

export async function findUserRole(userId: string) {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user ?? null;
}

export async function findOverridesForUser(userId: string) {
  return db
    .select()
    .from(userPermissionOverridesTable)
    .where(eq(userPermissionOverridesTable.userId, userId));
}

export async function deleteUserOverride(
  userId: string,
  permissionKey: string,
) {
  await db
    .delete(userPermissionOverridesTable)
    .where(
      and(
        eq(userPermissionOverridesTable.userId, userId),
        eq(userPermissionOverridesTable.permissionKey, permissionKey),
      ),
    );
}

export async function upsertUserOverride(
  userId: string,
  permissionKey: string,
  override: "allow" | "deny",
  reason: string | null,
  setBy: string,
) {
  await db
    .insert(userPermissionOverridesTable)
    .values({ userId, permissionKey, override, reason, setBy })
    .onConflictDoUpdate({
      target: [
        userPermissionOverridesTable.userId,
        userPermissionOverridesTable.permissionKey,
      ],
      set: { override, reason, setBy, updatedAt: new Date() },
    });
}
