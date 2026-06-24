import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Role-based data scope.
 *
 * Returns the set of user IDs whose owned records (leads.primarySalesId,
 * clients.assignedSalesId, …) the given viewer is allowed to see.
 *
 *   admin / ceo / director  -> null  (no restriction, see everything)
 *   team_leader             -> [self, ...directReports]
 *   sales / other           -> [self]
 *
 * Callers should treat `null` as "no WHERE clause needed".
 */
const UNRESTRICTED_ROLES = new Set(["admin", "ceo", "director"]);

export async function getVisibleUserIds(
  user: Pick<User, "id" | "role">,
): Promise<string[] | null> {
  if (!user) return [];
  if (UNRESTRICTED_ROLES.has(user.role)) return null;
  if (user.role === "team_leader") {
    const reports = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.teamLeaderId, user.id));
    const set = new Set<string>([user.id, ...reports.map((r) => r.id)]);
    return [...set];
  }
  return [user.id];
}

export function isUnrestricted(user: Pick<User, "role"> | null | undefined): boolean {
  return !!user && UNRESTRICTED_ROLES.has(user.role);
}
