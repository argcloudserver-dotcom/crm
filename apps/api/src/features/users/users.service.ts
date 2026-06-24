import { sanitizeUser } from "../../lib/sanitize";
import { logger } from "../../lib/logger";
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from "../../lib/email/auth-emails";
import * as repo from "./users.repository";
import type {
  ChangeRoleBeforeApprovalInput,
  ListUsersQuery,
  RejectUserInput,
  UpdateUserInput,
} from "./users.schemas";

const PRIVILEGED_FIELDS = [  "role",
  "status",
  "teamLeaderId",
  "permissions",
] as const;
type PrivilegedField = (typeof PRIVILEGED_FIELDS)[number];

export async function listUsers(query: ListUsersQuery) {
  let users = await repo.findAll();
  // Fresh OAuth signups are not real approval requests until the user submits
  // /complete-profile. Keep them out of admin/CEO employee queues/lists.
  users = users.filter((u) => u.status !== "pending" || u.profileCompleted);
  if (query.role) users = users.filter((u) => u.role === query.role);
  if (query.status) users = users.filter((u) => u.status === query.status);
  return users.map(sanitizeUser);
}

export async function listPendingUsers() {
  const users = await repo.findPending();
  return users.map(sanitizeUser);
}

export async function getUser(userId: string) {
  const user = await repo.findById(userId);
  return user ? sanitizeUser(user) : null;
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  caller: { id: string; role?: string; canManagePrivileged?: boolean; permissions?: string[] },
) {
  const canManagePrivileged =
    caller.canManagePrivileged === true ||
    caller.permissions?.includes("permissions.manage") ||
    caller.permissions?.includes("employees.edit") ||
    false;

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    updateData[key] = value;
  }

  // لا تسمح بتعديل الحقول الحساسة إلا إذا المستخدم معه صلاحية مناسبة
  if (!canManagePrivileged) {
    for (const field of PRIVILEGED_FIELDS) {
      delete updateData[field as PrivilegedField];
    }
  }

  // لا تسمح أبداً بتعديل id أو email من هذا المسار
  delete updateData.id;
  delete updateData.email;

  const updated = await repo.updateById(userId, updateData);
  return updated ? sanitizeUser(updated) : null;
}


export async function deleteUser(userId: string): Promise<void> {
  await repo.deleteById(userId);
}

export async function approveUser(
  userId: string,
  approvedBy: string,
  appUrl: string,
) {
  const current = await repo.findById(userId);
  if (!current) return null;
  if (!current.profileCompleted) {
    return { error: "User must complete signup before approval" as const };
  }

  const updated = await repo.updateById(userId, {
    status: "active",
    approvedBy,
    approvedAt: new Date(),
  });
  if (!updated) return null;

  // fire-and-forget مع تجاهل الخطأ عمداً حتى لا يكسر الـ request الأساسي
  sendAccountApprovedEmail(updated.email, updated.name, appUrl).catch(() => {});
  repo
    .insertNotification({
      userId: updated.id,
      type: "account_approved",
      titleEn: "Account Approved ✅",
      bodyEn: "Your account has been approved. Welcome to PropOS CRM!",
      link: "/home",
    })
    .catch(() => {});

  return sanitizeUser(updated);
}

export async function rejectUser(userId: string, input: RejectUserInput) {
  const updated = await repo.updateById(userId, {
    status: "rejected",
    rejectedAt: new Date(),
    rejectionReason: input.reason ?? null,
  });
  if (!updated) return null;

  sendAccountRejectedEmail(
    updated.email,
    updated.name,
    input.reason ?? null,
  ).catch(() => {});

  return sanitizeUser(updated);
}

/**
 * Lets admin/ceo change a pending user's requested role BEFORE approving
 * them. Logged for audit trail. Returns null if the user doesn't exist or
 * is no longer pending.
 */
export async function changeRoleBeforeApproval(
  userId: string,
  input: ChangeRoleBeforeApprovalInput,
  changedBy: string,
) {
  const current = await repo.findById(userId);
  if (!current) return null;
  if (current.status !== "pending") {
    return { error: "User is not pending" as const };
  }
  if (!current.profileCompleted) {
    return { error: "User must complete signup before role changes" as const };
  }
  const updated = await repo.updateById(userId, {
    role: input.newRole,
    teamLeaderId: input.newRole === "sales" ? input.teamLeaderId ?? null : null,
  });
  if (!updated) return null;

  logger.info(
    {
      event: "user.role_changed_before_approval",
      userId,
      from: current.role,
      to: input.newRole,
      changedBy,
    },
    "Admin changed pending user role before approval",
  );

  return sanitizeUser(updated);
}
