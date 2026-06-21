import { db, plannerTasksTable, type PlannerTask } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function findByUser(
  userId: string,
  date?: string,
): Promise<PlannerTask[]> {
  let rows = await db
    .select()
    .from(plannerTasksTable)
    .where(eq(plannerTasksTable.userId, userId));
  if (date) rows = rows.filter((t) => t.date === date);
  rows.sort((a, b) => a.position - b.position);
  return rows;
}

export async function countByUserAndDate(
  userId: string,
  date: string,
): Promise<number> {
  const rows = await db
    .select({ id: plannerTasksTable.id })
    .from(plannerTasksTable)
    .where(
      and(
        eq(plannerTasksTable.userId, userId),
        eq(plannerTasksTable.date, date),
      ),
    );
  return rows.length;
}

export async function insert(
  values: typeof plannerTasksTable.$inferInsert,
): Promise<PlannerTask> {
  const [task] = await db.insert(plannerTasksTable).values(values).returning();
  return task;
}

export async function updateById(
  taskId: string,
  values: Record<string, unknown>,
): Promise<PlannerTask | null> {
  const [updated] = await db
    .update(plannerTasksTable)
    .set(values)
    .where(eq(plannerTasksTable.id, taskId))
    .returning();
  return updated ?? null;
}

export async function deleteById(taskId: string): Promise<void> {
  await db.delete(plannerTasksTable).where(eq(plannerTasksTable.id, taskId));
}
