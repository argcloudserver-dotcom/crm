import { db, usersTable } from "@workspace/db";
import { eq, lte } from "drizzle-orm";

export async function markUserOnline(userId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ isOnline: true, lastActiveAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export async function markStaleUsersOffline(cutoff: Date): Promise<void> {
  await db
    .update(usersTable)
    .set({ isOnline: false })
    .where(lte(usersTable.lastActiveAt, cutoff));
}
