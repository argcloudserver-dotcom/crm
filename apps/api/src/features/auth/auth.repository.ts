import {
  db,
  usersTable,
  notificationsTable,
  type User,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export async function findActiveTeamLeaders() {
  // Include team_leader + director, in active OR pending status, so admins
  // always have someone to assign when approving a sales signup — even when
  // no team_leader has been approved yet.
  return db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.role, ["team_leader", "director"]),
        inArray(usersTable.status, ["active", "pending"]),
      ),
    );
}

export async function findByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function findById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user ?? null;
}

export async function findByName(name: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.name, name))
    .limit(1);
  return user ?? null;
}

export async function findByResetToken(token: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetToken, token))
    .limit(1);
  return user ?? null;
}

export async function insertUser(
  values: typeof usersTable.$inferInsert,
): Promise<User> {
  const [user] = await db.insert(usersTable).values(values).returning();
  return user;
}

export async function updateUser(
  userId: string,
  values: Partial<typeof usersTable.$inferInsert>,
): Promise<User | null> {
  const [updated] = await db
    .update(usersTable)
    .set(values)
    .where(eq(usersTable.id, userId))
    .returning();
  return updated ?? null;
}

export async function findActiveAdmins() {
  return db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.role, ["admin", "ceo"]),
        eq(usersTable.status, "active"),
      ),
    );
}

export async function insertAdminNotifications(
  admins: { id: string }[],
  newUser: { name: string; email: string; role: string },
) {
  if (admins.length === 0) return;
  await db.insert(notificationsTable).values(
    admins.map((admin) => ({
      userId: admin.id,
      type: "new_user_pending",
      titleEn: "New user awaiting approval",
      bodyEn: `${newUser.name} (${newUser.email}) registered as ${newUser.role} and is pending approval.`,
      link: "/employees/pending",
    })),
  );
}
