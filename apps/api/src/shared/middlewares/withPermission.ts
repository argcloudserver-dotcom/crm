/**
 * RBAC permission guard.
 *
 * AUDIT FIX: This module previously contained a second, divergent
 * implementation that read `(req as any).user.permissions`. That property is
 * never populated — `requireAuth` attaches the authenticated user to
 * `req.currentUser` — so every guarded route rejected legitimate, authenticated
 * users with `401 Unauthorized`. It also used `any`, duplicated the permission
 * registry, and bypassed the database-backed role/override resolver.
 *
 * It now delegates to the single canonical implementation in
 * `@workspace/permissions`, which reads `req.currentUser` and resolves
 * permissions through role defaults + per-user overrides. The typed
 * `Permission` union is preserved so call sites keep compile-time safety.
 */
import { withPermission as canonicalWithPermission } from "@workspace/permissions";

export type Permission =
  | "leads.view"    | "leads.create"   | "leads.update"
  | "leads.delete"  | "leads.import"
  | "projects.view" | "projects.create"| "projects.update" | "projects.delete"
  | "clients.view"  | "clients.create" | "clients.update"  | "clients.delete"
  | "resale.view"   | "resale.manage"
  | "users.view"    | "users.manage"   | "permissions.manage"
  | "reports.view"  | "dashboard.view"
  | "planner.view"  | "planner.manage"
  | "notifications.view" | "notifications.manage"
  | "upload.create";

export const withPermission = (perm: Permission) => canonicalWithPermission(perm);
