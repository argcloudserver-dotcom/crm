import { sanitizeUser } from "../../lib/sanitize";
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from "../../lib/email/auth-emails";
import * as repo from "./users.repository";
import type {
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
  caller: { id: string; permissions: string[] },
) {
  const canManagePrivileged = caller.permissions?.includes("permissions.manage");

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