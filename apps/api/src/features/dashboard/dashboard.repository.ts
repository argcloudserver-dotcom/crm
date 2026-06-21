import {
  db,
  leadsTable,
  usersTable,
  projectsTable,
  resaleUnitsTable,
  clientsTable,
  leadActivitiesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function loadStatsRaw() {
  return Promise.all([
    db.select().from(leadsTable),
    db.select().from(usersTable),
    db.select().from(projectsTable).where(eq(projectsTable.isActive, true)),
    db.select().from(resaleUnitsTable).where(eq(resaleUnitsTable.isActive, true)),
    db.select().from(clientsTable),
  ]);
}

export async function leadStatuses() {
  return db.select({ status: leadsTable.status }).from(leadsTable);
}

export async function leadsBySales() {
  return db
    .select({
      salesId: leadsTable.primarySalesId,
      status: leadsTable.status,
    })
    .from(leadsTable)
    .where(sql`${leadsTable.primarySalesId} IS NOT NULL`);
}

export async function activeUsers() {
  return db.select().from(usersTable).where(eq(usersTable.status, "active"));
}

export async function recentActivities() {
  return db
    .select({
      activity: leadActivitiesTable,
      leadName: leadsTable.name,
      userName: usersTable.name,
    })
    .from(leadActivitiesTable)
    .leftJoin(leadsTable, eq(leadActivitiesTable.leadId, leadsTable.id))
    .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id));
}
