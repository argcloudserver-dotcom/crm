/**
 * AUDIT FIX (v13): Resource-ownership guard.
 *
 * Usage in a route handler:
 *
 *   const lead = await leadsRepo.findById(req.params.leadId);
 *   if (!lead) return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
 *   assertOwner({ ownerId: lead.primarySalesId, user: req.currentUser! });
 *
 * Throws an HttpError(403) on mismatch unless the caller is an admin/manager,
 * which the global errorHandler renders as the standard error envelope.
 */
import type { User } from "@workspace/db";

export class HttpError extends Error {
  public status: number;
  public code: string;
  public reason?: string;
  constructor(status: number, code: string, message: string, reason?: string) {
    super(message);
    this.status = status;
    this.code = code;
    if (reason) this.reason = reason;
  }
}

const ELEVATED_ROLES = new Set(["admin", "manager"]);

export function assertOwner(args: {
  ownerId: string | null | undefined;
  user: User;
  resource?: string;
}): void {
  const { ownerId, user, resource = "resource" } = args;
  if (user.role && ELEVATED_ROLES.has(user.role)) return; // admins/managers bypass
  if (ownerId && ownerId === user.id) return;
  throw new HttpError(
    403,
    "NOT_OWNER",
    `You do not have access to this ${resource}`,
    `Only the owning user (or admin/manager) can modify this ${resource}`,
  );
}
