import {
  db,
  leadsTable,
  usersTable,
  projectsTable,
  resaleUnitsTable,
  clientsTable,
  leadActivitiesTable,
} from "@workspace/db";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

function leadScope(visibleUserIds: string[] | null): SQL | undefined {
  if (visibleUserIds === null) return undefined;
  if (visibleUserIds.length === 0) return sql`false`;
  return inArray(leadsTable.primarySalesId, visibleUserIds);
}

function clientScope(visibleUserIds: string[] | null): SQL | undefined {
  if (visibleUserIds === null) return undefined;
  if (visibleUserIds.length === 0) return sql`false`;
  return inArray(clientsTable.assignedSalesId, visibleUserIds);
}

export async function loadStatsRaw(visibleUserIds: string[] | null) {
  const leadW = leadScope(visibleUserIds);
  const clientW = clientScope(visibleUserIds);
  return Promise.all([
    leadW ? db.select().from(leadsTable).where(leadW) : db.select().from(leadsTable),
    db.select().from(usersTable),
    db.select().from(projectsTable).where(eq(projectsTable.isActive, true)),
    db.select().from(resaleUnitsTable).where(eq(resaleUnitsTable.isActive, true)),
    clientW
      ? db.select().from(clientsTable).where(clientW)
      : db.select().from(clientsTable),
  ]);
}

export async function leadStatuses(visibleUserIds: string[] | null) {
  const w = leadScope(visibleUserIds);
  const q = db.select({ status: leadsTable.status }).from(leadsTable);
  return w ? q.where(w) : q;
}

export async function leadsBySales(visibleUserIds: string[] | null) {
  const w = leadScope(visibleUserIds);
  const base = db
    .select({
      salesId: leadsTable.primarySalesId,
      status: leadsTable.status,
    })
    .from(leadsTable);
  if (w) return base.where(and(sql`${leadsTable.primarySalesId} IS NOT NULL`, w));
  return base.where(sql`${leadsTable.primarySalesId} IS NOT NULL`);
}

export async function activeUsers() {
  return db.select().from(usersTable).where(eq(usersTable.status, "active"));
}

export async function recentActivities(visibleUserIds: string[] | null) {
  const base = db
    .select({
      activity: leadActivitiesTable,
      leadName: leadsTable.name,
      userName: usersTable.name,
    })
    .from(leadActivitiesTable)
    .leftJoin(leadsTable, eq(leadActivitiesTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id));
  if (visibleUserIds === null) return base;
  if (visibleUserIds.length === 0) {
    return [] as Awaited<ReturnType<typeof base>>;
  }
  return base.where(inArray(leadsTable.primarySalesId, visibleUserIds));
}
