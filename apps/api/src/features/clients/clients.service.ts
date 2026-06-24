import type { Request } from "express";
import { camelToSnake } from "../../shared/utils/camelToSnake";
import { getVisibleUserIds } from "../../shared/utils/scope";
import * as repo from "./clients.repository";
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "./clients.schemas";
import type { ClientWithRelations } from "./clients.types";

const DEAL_FIELDS = [
  "name",
  "phone",
  "email",
  "dealValue",
  "projectId",
  "assignedSalesId",
  "notes",
  "unitNumber",
  "unitType",
  "area",
  "paymentMethod",
  "downPayment",
  "contractDate",
  "numberOfInstallments",
  "installmentAmount",
] as const;

// Role-aware list. Pass req so we can scope by viewer role.
export async function list(
  req: Request,
  query: ListClientsQuery,
): Promise<ClientWithRelations[]> {
  const viewer = req.currentUser!;
  const visibleIds = await getVisibleUserIds(viewer);
  const rows = await repo.findAllWithRelations(visibleIds);
  let enriched: ClientWithRelations[] = rows.map((r) => ({
    ...r.client,
    projectName: r.projectName ?? null,
    assignedSalesName: r.assignedSalesName ?? null,
  }));

  if (query.search) {
    const q = query.search.toLowerCase();
    enriched = enriched.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }
  return enriched;
}

export async function getClient(
  clientId: string,
): Promise<ClientWithRelations | null> {
  const row = await repo.findByIdWithRelations(clientId);
  if (!row) return null;
  return {
    ...row.client,
    projectName: row.projectName ?? null,
    assignedSalesName: row.assignedSalesName ?? null,
  };
}

// تم تغيير الاسم إلى create
export async function create(
  input: CreateClientInput,
): Promise<ClientWithRelations> {
  const client = await repo.insert({
    name: input.name!,
    phone: input.phone ?? null,
    email: input.email ?? null,
    dealValue: input.dealValue ?? null,
    projectId: input.projectId ?? null,
    assignedSalesId: input.assignedSalesId ?? null,
    notes: input.notes ?? null,
    unitNumber: input.unitNumber ?? null,
    unitType: input.unitType ?? null,
    area: input.area ?? null,
    paymentMethod: input.paymentMethod ?? null,
    downPayment: input.downPayment ?? null,
    contractDate: input.contractDate ? new Date(input.contractDate) : null,
    numberOfInstallments: input.numberOfInstallments ?? null,
    installmentAmount: input.installmentAmount ?? null,
  });
  return { ...client, projectName: null, assignedSalesName: null };
}

// تم تغيير الاسم إلى update
export async function update(
  clientId: string,
  input: UpdateClientInput,
): Promise<ClientWithRelations | null> {
  const updateData: Record<string, unknown> = {};
  for (const f of DEAL_FIELDS) {
    if (f in input) {
      const v = (input as Record<string, unknown>)[f];
      if (f === "contractDate") {
        updateData[camelToSnake(f)] = v ? new Date(v as string) : null;
      } else if (f === "numberOfInstallments") {
        updateData[camelToSnake(f)] = v === null || v === undefined ? null : Number(v);
      } else {
        updateData[camelToSnake(f)] = v;
      }
    }
  }
  const updated = await repo.updateById(clientId, updateData);
  if (!updated) return null;
  return { ...updated, projectName: null, assignedSalesName: null };
}

// تم إضافة دالة الحذف (remove) اللي كان الـ Router بيدور عليها
export async function remove(clientId: string) {
  // افترضنا إن عندك دالة deleteById في ملف الـ repository
  // لو اسمها مختلف عندك، غيرها للاسم الصح
  await repo.deleteById(clientId);
  return { success: true, id: clientId };
}