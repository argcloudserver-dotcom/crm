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
import { eq } from "drizzle-orm";

const leadSelect = {
  lead: leadsTable,
  projectName: projectsTable.name,
  primarySalesName: usersTable.name,
};

export async function findAllWithRelations() {
  return db
    .select(leadSelect)
    .from(leadsTable)
    .leftJoin(projectsTable, eq(leadsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(leadsTable.primarySalesId, usersTable.id));
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
