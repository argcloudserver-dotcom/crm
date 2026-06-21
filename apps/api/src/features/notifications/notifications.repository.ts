import { db, notificationsTable, type Notification } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function listForUser(userId: string): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId));
  rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return rows;
}

export async function markRead(
  notificationId: string,
  userId: string,
): Promise<Notification | null> {
  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
}
