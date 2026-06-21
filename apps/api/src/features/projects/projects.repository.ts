import {
  db,
  projectsTable,
  leadsTable,
  clientsTable,
  type Project,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const withCount = () => ({
  project: projectsTable,
  leadsCount:
    sql<number>`(SELECT COUNT(*) FROM leads WHERE leads.project_id = ${projectsTable.id})`.as(
      "leadsCount",
    ),
});

export async function findAllWithCounts() {
  return db.select(withCount()).from(projectsTable);
}

export async function findByIdWithCount(projectId: string) {
  const [row] = await db
    .select(withCount())
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  return row ?? null;
}

export async function insert(
  values: typeof projectsTable.$inferInsert,
): Promise<Project> {
  const [project] = await db.insert(projectsTable).values(values).returning();
  return project;
}

export async function updateById(
  projectId: string,
  values: Record<string, unknown>,
): Promise<Project | null> {
  const [updated] = await db
    .update(projectsTable)
    .set(values)
    .where(eq(projectsTable.id, projectId))
    .returning();
  return updated ?? null;
}

export async function detachAndDelete(projectId: string): Promise<void> {
  await db
    .update(leadsTable)
    .set({ projectId: null })
    .where(eq(leadsTable.projectId, projectId));
  await db
    .update(clientsTable)
    .set({ projectId: null })
    .where(eq(clientsTable.projectId, projectId));
  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
}
