import { db, usersTable, notificationsTable, type User } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function findAll(): Promise<User[]> {
  return db.select().from(usersTable);
}

export async function findPending(): Promise<User[]> {
  return db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.status, "pending"),
        eq(usersTable.profileCompleted, true),
      ),
    );
}

export async function findById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user ?? null;
}

export async function updateById(
  userId: string,
  values: Record<string, unknown>,
): Promise<User | null> {
  const [updated] = await db
    .update(usersTable)
    .set(values)
    .where(eq(usersTable.id, userId))
    .returning();
  return updated ?? null;
}

export async function deleteById(userId: string): Promise<void> {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

export async function insertNotification(
  values: typeof notificationsTable.$inferInsert,
): Promise<void> {
  await db.insert(notificationsTable).values(values);
}
