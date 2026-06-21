import {
  db,
  leadDelaysTable,
  leadsTable,
  notificationsTable,
  usersTable,
  type Lead,
  type LeadDelay,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function findPendingWithRelations() {
  return db
    .select({
      delay: leadDelaysTable,
      leadName: leadsTable.name,
      requesterName: usersTable.name,
    })
    .from(leadDelaysTable)
    .leftJoin(leadsTable, eq(leadDelaysTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(leadDelaysTable.requestedBy, usersTable.id))
    .where(eq(leadDelaysTable.status, "pending"));
}

export async function findLead(leadId: string): Promise<Lead | null> {
  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, leadId))
    .limit(1);
  return lead ?? null;
}

export async function insertDelay(
  values: typeof leadDelaysTable.$inferInsert,
): Promise<LeadDelay> {
  const [delay] = await db.insert(leadDelaysTable).values(values).returning();
  return delay;
}

export async function findAdmins() {
  return db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
}

export async function insertNotifications(
  values: (typeof notificationsTable.$inferInsert)[],
): Promise<void> {
  if (values.length === 0) return;
  await db.insert(notificationsTable).values(values);
}

export async function reviewDelay(
  delayId: string,
  values: Partial<typeof leadDelaysTable.$inferInsert>,
): Promise<LeadDelay | null> {
  const [updated] = await db
    .update(leadDelaysTable)
    .set(values)
    .where(eq(leadDelaysTable.id, delayId))
    .returning();
  return updated ?? null;
}

export async function updateLeadDelayedUntil(
  leadId: string,
  until: Date,
): Promise<void> {
  await db
    .update(leadsTable)
    .set({ delayedUntil: until })
    .where(eq(leadsTable.id, leadId));
}
