import type { ResalePhoto } from "@workspace/db";
import * as repo from "./resale.repository";
import type {
  AssignResaleInput,
  CreatePhotoInput,
  CreateResaleInput,
  ListResaleQuery,
  UpdateResaleInput,
} from "./resale.schemas";
import type { ResaleUnitWithPhotos } from "./resale.types";

const ADMIN_ROLES = ["ceo", "admin", "director", "manager"] as const;

export function isAdmin(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

function sortPhotos(photos: ResalePhoto[]): ResalePhoto[] {
  return [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listUnits(
  currentUserId: string,
  currentRole: string,
  query: ListResaleQuery,
): Promise<ResaleUnitWithPhotos[]> {
  let units = await repo.findAllUnits();
  const photos = await repo.findAllPhotos();

  if (!isAdmin(currentRole)) {
    units = units.filter((u) => u.assignedTo === currentUserId);
  }
  if (query.projectId) units = units.filter((u) => u.projectId === query.projectId);
  if (query.unitType) units = units.filter((u) => u.unitType === query.unitType);
  if (query.status === "active") units = units.filter((u) => u.isActive);
  else if (query.status === "inactive") units = units.filter((u) => !u.isActive);

  const photosMap: Record<string, ResalePhoto[]> = {};
  for (const p of photos) {
    (photosMap[p.unitId] ??= []).push(p);
  }

  const assignedIds = [
    ...new Set(units.map((u) => u.assignedTo).filter(Boolean) as string[]),
  ];
  const assignedUsers = await repo.findUserNames(assignedIds);

  return units.map((u) => ({
    ...u,
    assignedToName: u.assignedTo ? (assignedUsers[u.assignedTo] ?? null) : null,
    photos: sortPhotos(photosMap[u.id] ?? []),
  }));
}

export async function createUnit(
  currentUserId: string,
  input: CreateResaleInput,
): Promise<ResaleUnitWithPhotos> {
  const unit = await repo.insertUnit({
    projectId: input.projectId ?? null,
    projectName: input.projectName,
    area: input.area ?? null,
    price: input.price ?? null,
    floor: input.floor ?? null,
    unitType: input.unitType ?? null,
    description: input.description ?? null,
    ownerName: input.ownerName ?? null,
    ownerPhone: input.ownerPhone ?? null,
    ownerEmail: input.ownerEmail ?? null,
    ownerNotes: input.ownerNotes ?? null,
    isOwnerPhoneHidden: input.isOwnerPhoneHidden ?? false,
    isOwnerEmailHidden: input.isOwnerEmailHidden ?? false,
    createdBy: currentUserId,
  });

  if (input.photos && input.photos.length > 0) {
    await repo.insertPhotos(
      input.photos.slice(0, 5).map((url, i) => ({
        unitId: unit.id,
        url,
        sortOrder: i,
        uploadedBy: currentUserId,
      })),
    );
  }

  const photos = await repo.findPhotosForUnit(unit.id);
  return { ...unit, assignedToName: null, photos: sortPhotos(photos) };
}

export type GetUnitResult =
  | { ok: true; unit: ResaleUnitWithPhotos }
  | { ok: false; status: 404 | 403; reason: string };

export async function getUnit(
  unitId: string,
  currentUserId: string,
  currentRole: string,
): Promise<GetUnitResult> {
  const unit = await repo.findUnit(unitId);
  if (!unit) return { ok: false, status: 404, reason: "Resale unit not found" };
  if (!isAdmin(currentRole) && unit.assignedTo !== currentUserId) {
    return { ok: false, status: 403, reason: "Forbidden" };
  }

  const [photos, assignedToName] = await Promise.all([
    repo.findPhotosForUnit(unitId),
    unit.assignedTo ? repo.findUserName(unit.assignedTo) : Promise.resolve(null),
  ]);

  return {
    ok: true,
    unit: { ...unit, assignedToName, photos: sortPhotos(photos) },
  };
}

const UPDATE_FIELDS = [
  "projectId",
  "projectName",
  "area",
  "price",
  "floor",
  "unitType",
  "description",
  "ownerName",
  "ownerPhone",
  "ownerEmail",
  "ownerNotes",
  "isOwnerPhoneHidden",
  "isOwnerEmailHidden",
  "isActive",
] as const;

export async function updateUnit(
  unitId: string,
  input: UpdateResaleInput,
): Promise<ResaleUnitWithPhotos | null> {
  const updateData: Record<string, unknown> = {};
  for (const f of UPDATE_FIELDS) {
    if (f in input) {
      updateData[f] = (input as Record<string, unknown>)[f];
    }
  }
  const updated = await repo.updateUnit(unitId, updateData);
  if (!updated) return null;
  const [photos, assignedToName] = await Promise.all([
    repo.findPhotosForUnit(unitId),
    updated.assignedTo
      ? repo.findUserName(updated.assignedTo)
      : Promise.resolve(null),
  ]);
  return { ...updated, assignedToName, photos: sortPhotos(photos) };
}

export async function assignUnit(
  unitId: string,
  input: AssignResaleInput,
): Promise<ResaleUnitWithPhotos | null> {
  const updated = await repo.updateUnit(unitId, {
    assigned_to: input.assignedTo ?? null,
  });
  if (!updated) return null;
  const [photos, assignedToName] = await Promise.all([
    repo.findPhotosForUnit(unitId),
    updated.assignedTo
      ? repo.findUserName(updated.assignedTo)
      : Promise.resolve(null),
  ]);
  return { ...updated, assignedToName, photos: sortPhotos(photos) };
}

export async function deleteUnit(unitId: string): Promise<void> {
  await repo.deleteUnit(unitId);
}

export type AddPhotoResult =
  | { ok: true; photo: ResalePhoto }
  | { ok: false; reason: string };

export async function addPhoto(
  unitId: string,
  currentUserId: string,
  input: CreatePhotoInput,
): Promise<AddPhotoResult> {
  const existing = await repo.findPhotosForUnit(unitId);
  if (existing.length >= 5) {
    return { ok: false, reason: "Maximum 5 photos per unit" };
  }
  const photo = await repo.insertPhoto({
    unitId,
    url: input.url,
    caption: input.caption ?? null,
    sortOrder: existing.length,
    uploadedBy: currentUserId,
  });
  return { ok: true, photo };
}

export async function deletePhoto(
  unitId: string,
  photoId: string,
): Promise<void> {
  await repo.deletePhoto(unitId, photoId);
}
