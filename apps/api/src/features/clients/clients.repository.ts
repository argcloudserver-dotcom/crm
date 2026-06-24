import {
  db,
  clientsTable,
  projectsTable,
  usersTable,
  type Client,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export async function findAllWithRelations(
  visibleUserIds: string[] | null = null,
) {
  const base = db
    .select({
      client: clientsTable,
      projectName: projectsTable.name,
      assignedSalesName: usersTable.name,
    })
    .from(clientsTable)
    .leftJoin(projectsTable, eq(clientsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(clientsTable.assignedSalesId, usersTable.id));
  if (visibleUserIds === null) return base;
  if (visibleUserIds.length === 0) return [] as Awaited<ReturnType<typeof base>>;
  return base.where(inArray(clientsTable.assignedSalesId, visibleUserIds));
}

export async function findByIdWithRelations(clientId: string) {
  const [row] = await db
    .select({
      client: clientsTable,
      projectName: projectsTable.name,
      assignedSalesName: usersTable.name,
    })
    .from(clientsTable)
    .leftJoin(projectsTable, eq(clientsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(clientsTable.assignedSalesId, usersTable.id))
    .where(eq(clientsTable.id, clientId))
    .limit(1);
  return row ?? null;
}

export async function insert(
  values: typeof clientsTable.$inferInsert,
): Promise<Client> {
  const [client] = await db.insert(clientsTable).values(values).returning();
  return client;
}

export async function updateById(
  clientId: string,
  values: Record<string, unknown>,
): Promise<Client | null> {
  const [updated] = await db
    .update(clientsTable)
    .set(values)
    .where(eq(clientsTable.id, clientId))
    .returning();
  return updated ?? null;
}

export async function deleteById(clientId: string): Promise<void> {
  await db.delete(clientsTable).where(eq(clientsTable.id, clientId));
}
