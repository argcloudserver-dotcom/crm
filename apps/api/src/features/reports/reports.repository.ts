import {
  db,
  leadsTable,
  usersTable,
  resaleUnitsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function loadLeadsForSales() {
  return db
    .select({
      id: leadsTable.id,
      status: leadsTable.status,
      salesId: leadsTable.primarySalesId,
      createdAt: leadsTable.createdAt,
    })
    .from(leadsTable);
}

export async function loadLeadsForReport() {
  return db
    .select({
      status: leadsTable.status,
      source: leadsTable.source,
      createdAt: leadsTable.createdAt,
      salesId: leadsTable.primarySalesId,
    })
    .from(leadsTable);
}

export async function loadResaleUnits() {
  return db
    .select({
      id: resaleUnitsTable.id,
      projectName: resaleUnitsTable.projectName,
      unitType: resaleUnitsTable.unitType,
      price: resaleUnitsTable.price,
      isActive: resaleUnitsTable.isActive,
      createdAt: resaleUnitsTable.createdAt,
    })
    .from(resaleUnitsTable);
}

export async function activeUsers() {
  return db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.status, "active"));
}

export interface TrendsParams {
  fromIso: string;
  toIso: string;
  userId?: string;
}

export interface TrendsRow {
  date: string;
  total: number;
  won: number;
  lost: number;
  in_progress: number;
}

export async function loadDailyTrends(params: TrendsParams): Promise<TrendsRow[]> {
  const userFilter = params.userId
    ? sql`AND primary_sales_id = ${params.userId}`
    : sql``;
  const query = sql`
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS total,
      COUNT(CASE WHEN status = 'won' THEN 1 END)::int AS won,
      COUNT(CASE WHEN status = 'lost' THEN 1 END)::int AS lost,
      COUNT(CASE WHEN status NOT IN ('won','lost') THEN 1 END)::int AS in_progress
    FROM leads
    WHERE created_at >= ${params.fromIso}
      AND created_at <= ${params.toIso}
      ${userFilter}
    GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY date ASC
  `;
  const result = await db.execute(query);
  return result.rows as unknown as TrendsRow[];
}

export interface ProjectsReportRow {
  id: string;
  name: string;
  imageUrl: string | null;
  total: number;
  won: number;
  lost: number;
  in_progress: number;
}

export async function loadProjectsReport(
  params: TrendsParams,
): Promise<ProjectsReportRow[]> {
  const userFilter = params.userId
    ? sql`AND l.primary_sales_id = ${params.userId}`
    : sql``;
  const query = sql`
    SELECT
      p.id,
      p.name,
      p.image_url AS "imageUrl",
      COUNT(l.id)::int AS total,
      COUNT(CASE WHEN l.status = 'won' THEN 1 END)::int AS won,
      COUNT(CASE WHEN l.status = 'lost' THEN 1 END)::int AS lost,
      COUNT(CASE WHEN l.status NOT IN ('won','lost') THEN 1 END)::int AS in_progress
    FROM projects p
    LEFT JOIN leads l ON l.project_id = p.id
      AND l.created_at >= ${params.fromIso}
      AND l.created_at <= ${params.toIso}
      ${userFilter}
    GROUP BY p.id, p.name, p.image_url
    ORDER BY total DESC
  `;
  const result = await db.execute(query);
  return result.rows as unknown as ProjectsReportRow[];
}
