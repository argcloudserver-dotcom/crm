import {
  db,
  leadsTable,
  leadActivitiesTable,
  usersTable,
  projectsTable,
  notificationsTable,
  type Lead,
  type LeadActivity,
  type User,
  type Project,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const leadSelect = {
  lead: leadsTable,
  projectName: projectsTable.name,
  primarySalesName: usersTable.name,
};

/**
 * @param visibleUserIds - null = no restriction (admin/ceo/director).
 *   Otherwise: only leads whose primarySalesId is in the list. Unassigned
 *   leads (primarySalesId IS NULL) are visible only when the caller is
 *   unrestricted, so sales/team-leader scopes hide orphan leads.
 */
export async function findAllWithRelations(visibleUserIds: string[] | null = null) {
  const base = db
    .select(leadSelect)
    .from(leadsTable)
    .leftJoin(projectsTable, eq(leadsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(leadsTable.primarySalesId, usersTable.id));
  if (visibleUserIds === null) return base;
  if (visibleUserIds.length === 0) return [] as Awaited<ReturnType<typeof base>>;
  return base.where(inArray(leadsTable.primarySalesId, visibleUserIds));
}

export async function findByIdWithRelations(leadId: string) {
  const [row] = await db
    .select(leadSelect)
    .from(leadsTable)
    .leftJoin(projectsTable, eq(leadsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(leadsTable.primarySalesId, usersTable.id))
    .where(eq(leadsTable.id, leadId))
    .limit(1);
  return row ?? null;
}

export async function findById(leadId: string): Promise<Lead | null> {
  const [row] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, leadId))
    .limit(1);
  return row ?? null;
}

export async function insert(
  values: typeof leadsTable.$inferInsert,
): Promise<Lead> {
  const [lead] = await db.insert(leadsTable).values(values).returning();
  return lead;
}

export async function bulkInsert(
  values: (typeof leadsTable.$inferInsert)[],
): Promise<void> {
  if (values.length === 0) return;
  await db.insert(leadsTable).values(values).onConflictDoNothing();
}

export async function updateById(
  leadId: string,
  values: Record<string, unknown>,
): Promise<Lead | null> {
  const [updated] = await db
    .update(leadsTable)
    .set(values)
    .where(eq(leadsTable.id, leadId))
    .returning();
  return updated ?? null;
}

export async function deleteById(leadId: string): Promise<void> {
  await db.delete(leadsTable).where(eq(leadsTable.id, leadId));
}

export async function findUser(id: string): Promise<User | null> {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  return u ?? null;
}

export async function findProject(id: string): Promise<Project | null> {
  const [p] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);
  return p ?? null;
}

export async function insertNotification(
  values: typeof notificationsTable.$inferInsert,
): Promise<void> {
  await db.insert(notificationsTable).values(values);
}

export async function listActivitiesWithUser(leadId: string) {
  return db
    .select({ activity: leadActivitiesTable, userName: usersTable.name })
    .from(leadActivitiesTable)
    .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id))
    .where(eq(leadActivitiesTable.leadId, leadId));
}

export async function insertActivity(
  values: typeof leadActivitiesTable.$inferInsert,
): Promise<LeadActivity> {
  const [a] = await db.insert(leadActivitiesTable).values(values).returning();
  return a;
}

// ---- Assignment history ----------------------------------------------------
import { leadAssignmentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

export type AssignmentRow = typeof leadAssignmentsTable.$inferSelect;
export type InsertAssignment = typeof leadAssignmentsTable.$inferInsert;

export async function insertAssignment(values: InsertAssignment) {
  const [row] = await db.insert(leadAssignmentsTable).values(values).returning();
  return row;
}

export async function insertAssignments(values: InsertAssignment[]) {
  if (values.length === 0) return [] as AssignmentRow[];
  return db.insert(leadAssignmentsTable).values(values).returning();
}

export async function listAssignmentsWithUsers(leadId: string) {
  return db
    .select({
      assignment: leadAssignmentsTable,
      assignedToName: usersTable.name,
    })
    .from(leadAssignmentsTable)
    .leftJoin(usersTable, eq(leadAssignmentsTable.assignedTo, usersTable.id))
    .where(eq(leadAssignmentsTable.leadId, leadId))
    .orderBy(desc(leadAssignmentsTable.assignedAt));
}

export async function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(usersTable).where(inArray(usersTable.id, ids));
}
