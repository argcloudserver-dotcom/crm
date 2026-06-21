import {
  db,
  resaleUnitsTable,
  resalePhotosTable,
  usersTable,
  type ResalePhoto,
  type ResaleUnit,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function findAllUnits(): Promise<ResaleUnit[]> {
  return db.select().from(resaleUnitsTable);
}

export async function findAllPhotos(): Promise<ResalePhoto[]> {
  return db.select().from(resalePhotosTable);
}

export async function findUnit(unitId: string): Promise<ResaleUnit | null> {
  const [unit] = await db
    .select()
    .from(resaleUnitsTable)
    .where(eq(resaleUnitsTable.id, unitId))
    .limit(1);
  return unit ?? null;
}

export async function findPhotosForUnit(
  unitId: string,
): Promise<ResalePhoto[]> {
  return db
    .select()
    .from(resalePhotosTable)
    .where(eq(resalePhotosTable.unitId, unitId));
}

export async function insertUnit(
  values: typeof resaleUnitsTable.$inferInsert,
): Promise<ResaleUnit> {
  const [unit] = await db.insert(resaleUnitsTable).values(values).returning();
  return unit;
}

export async function updateUnit(
  unitId: string,
  values: Record<string, unknown>,
): Promise<ResaleUnit | null> {
  const [updated] = await db
    .update(resaleUnitsTable)
    .set(values)
    .where(eq(resaleUnitsTable.id, unitId))
    .returning();
  return updated ?? null;
}

export async function deleteUnit(unitId: string): Promise<void> {
  await db.delete(resaleUnitsTable).where(eq(resaleUnitsTable.id, unitId));
}

export async function insertPhotos(
  values: (typeof resalePhotosTable.$inferInsert)[],
): Promise<void> {
  if (values.length === 0) return;
  await db.insert(resalePhotosTable).values(values);
}

export async function insertPhoto(
  values: typeof resalePhotosTable.$inferInsert,
): Promise<ResalePhoto> {
  const [photo] = await db
    .insert(resalePhotosTable)
    .values(values)
    .returning();
  return photo;
}

export async function deletePhoto(
  unitId: string,
  photoId: string,
): Promise<void> {
  await db
    .delete(resalePhotosTable)
    .where(
      and(
        eq(resalePhotosTable.id, photoId),
        eq(resalePhotosTable.unitId, unitId),
      ),
    );
}

export async function findUserName(userId: string): Promise<string | null> {
  const [u] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return u?.name ?? null;
}

export async function findUserNames(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const rows = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (userIds.includes(row.id)) map[row.id] = row.name;
  }
  return map;
}
