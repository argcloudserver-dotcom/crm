import type { Request } from "express";
import {
  sendLeadAssignedEmail,
  sendLeadStatusChangedEmail,
} from "../../lib/email/lead-emails";
import { logger } from "../../lib/logger";
import { camelToSnake } from "../../shared/utils/camelToSnake";
import { getAppUrl } from "../../shared/utils/getAppUrl";
import * as repo from "./leads.repository";
import type {
  AssignLeadInput,
  CreateActivityInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from "./leads.schemas";
import {
  LEAD_STATUSES,
  type LeadActivityWithUser,
  type LeadStatus,
  type LeadWithRelations,
} from "./leads.types";

function enrich(row: {
  lead: import("@workspace/db").Lead;
  projectName: string | null;
  primarySalesName: string | null;
}): LeadWithRelations {
  return {
    ...row.lead,
    projectName: row.projectName ?? null,
    primarySalesName: row.primarySalesName ?? null,
  };
}

export async function listLeads(query: ListLeadsQuery): Promise<LeadWithRelations[]> {
  const rows = await repo.findAllWithRelations();
  let leads = rows.map(enrich);
  if (query.status) leads = leads.filter((l) => l.status === query.status);
  if (query.projectId)
    leads = leads.filter((l) => l.projectId === query.projectId);
  if (query.search) {
    const q = query.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || (l.phone ?? "").includes(q),
    );
  }
  return leads;
}

export async function getKanban(): Promise<{
  columns: { status: LeadStatus; leads: LeadWithRelations[] }[];
}> {
  const rows = await repo.findAllWithRelations();
  const enriched = rows.map(enrich);
  const columns = LEAD_STATUSES.map((status) => ({
    status,
    leads: enriched.filter((l) => l.status === status),
  }));
  return { columns };
}

export async function getLead(leadId: string): Promise<LeadWithRelations | null> {
  const row = await repo.findByIdWithRelations(leadId);
  return row ? enrich(row) : null;
}

export async function createLead(
  req: Request,
  input: CreateLeadInput,
): Promise<LeadWithRelations> {
  const currentUser = req.currentUser!;

  const lead = await repo.insert({
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: (input.source as "manual") ?? "manual",
    status: (input.status as "new") ?? "new",
    projectId: input.projectId ?? null,
    notes: input.notes ?? null,
    deadline: input.deadline ? new Date(input.deadline) : null,
    primarySalesId: input.primarySalesId ?? null,
    createdBy: currentUser.id,
  });

  if (input.primarySalesId) {
    void notifyAssignment(
      req,
      lead.id,
      input.primarySalesId,
      input.name,
      input.phone ?? "N/A",
      input.projectId ?? null,
    );
  }

  return { ...lead, projectName: null, primarySalesName: null };
}

const UPDATABLE_FIELDS = [
  "name",
  "phone",
  "email",
  "source",
  "status",
  "projectId",
  "notes",
  "nextAction",
  "nextActionAt",
  "deadline",
  "primarySalesId",
  "outcome",
] as const;

export async function updateLead(
  req: Request,
  leadId: string,
  input: UpdateLeadInput,
): Promise<LeadWithRelations | null> {
  const oldLead = await repo.findById(leadId);
  if (!oldLead) return null;

  const updateData: Record<string, unknown> = {};
  for (const f of UPDATABLE_FIELDS) {
    if (f in input) {
      const value = (input as Record<string, unknown>)[f];
      if (f === "name") updateData.name = value;
      else updateData[camelToSnake(f)] = value === null ? null : value;
    }
  }

  const updated = await repo.updateById(leadId, updateData);
  if (!updated) return null;

  const newSalesId = updated.primarySalesId;
  if (newSalesId && newSalesId !== oldLead.primarySalesId) {
    void notifyAssignment(
      req,
      leadId,
      newSalesId,
      updated.name,
      updated.phone ?? "N/A",
      updated.projectId,
    );
  }

  if (updated.status !== oldLead.status && newSalesId) {
    void notifyStatusChange(
      req,
      leadId,
      newSalesId,
      updated.name,
      oldLead.status,
      updated.status,
    );
  }

  return { ...updated, projectName: null, primarySalesName: null };
}

export async function deleteLead(leadId: string): Promise<void> {
  await repo.deleteById(leadId);
}

export async function assignLead(
  req: Request,
  leadId: string,
  input: AssignLeadInput,
): Promise<LeadWithRelations | null> {
  const oldLead = await repo.findById(leadId);
  const updated = await repo.updateById(leadId, { primary_sales_id: input.salesId });
  if (!updated) return null;

  let salesUserName: string | null = null;
  if (input.salesId !== oldLead?.primarySalesId) {
    const salesUser = await repo.findUser(input.salesId);
    salesUserName = salesUser?.name ?? null;
    if (salesUser) {
      void notifyAssignment(
        req,
        leadId,
        input.salesId,
        updated.name,
        updated.phone ?? "N/A",
        updated.projectId,
      );
    }
  }

  return { ...updated, projectName: null, primarySalesName: salesUserName };
}

export async function updateLeadStatus(
  req: Request,
  leadId: string,
  input: UpdateLeadStatusInput,
): Promise<LeadWithRelations | null> {
  const oldLead = await repo.findById(leadId);
  const updated = await repo.updateById(leadId, {
    status: input.status,
    last_action_at: new Date(),
  });
  if (!updated) return null;

  if (oldLead && updated.status !== oldLead.status && updated.primarySalesId) {
    void notifyStatusChange(
      req,
      leadId,
      updated.primarySalesId,
      updated.name,
      oldLead.status,
      updated.status,
    );
  }
  return { ...updated, projectName: null, primarySalesName: null };
}

export async function listActivities(
  leadId: string,
): Promise<LeadActivityWithUser[]> {
  const rows = await repo.listActivitiesWithUser(leadId);
  return rows.map((r) => ({ ...r.activity, userName: r.userName ?? null }));
}

export async function createActivity(
  req: Request,
  leadId: string,
  input: CreateActivityInput,
): Promise<LeadActivityWithUser> {
  const currentUser = req.currentUser!;
  const activity = await repo.insertActivity({
    leadId,
    userId: currentUser.id,
    type: input.type as "call",
    notes: input.notes ?? null,
    outcome: input.outcome ?? null,
    nextAction: input.nextAction ?? null,
    nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
    duration: input.duration != null ? String(input.duration) : null,
  });
  await repo.updateById(leadId, { last_action_at: new Date() });
  return { ...activity, userName: currentUser.name };
}

export interface BulkImportRow {
  Name?: string;
  name?: string;
  Phone?: string;
  phone?: string;
  Email?: string;
  email?: string;
  Source?: string;
  source?: string;
  Status?: string;
  status?: string;
  Notes?: string;
  notes?: string;
}

export interface BulkImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export async function bulkImport(
  req: Request,
  rows: BulkImportRow[],
): Promise<BulkImportResult> {
  const currentUser = req.currentUser!;
  const errors: BulkImportResult["errors"] = [];
  const values: Parameters<typeof repo.bulkInsert>[0] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = String(row.Name ?? row.name ?? "").trim();
    if (!name) {
      errors.push({ row: rowNum, message: "Name is required" });
      continue;
    }
    values.push({
      name,
      phone: String(row.Phone ?? row.phone ?? "").trim() || null,
      email: String(row.Email ?? row.email ?? "").trim() || null,
      source:
        (String(row.Source ?? row.source ?? "manual").trim() as "manual") ||
        "manual",
      status:
        (String(row.Status ?? row.status ?? "new").trim() as "new") || "new",
      notes: String(row.Notes ?? row.notes ?? "").trim() || null,
      createdBy: currentUser.id,
    });
  }

  if (values.length > 0) await repo.bulkInsert(values);
  return { imported: values.length, errors };
}

// ── Internal notifications ───────────────────────────────────────────────────
async function notifyAssignment(
  req: Request,
  leadId: string,
  salesId: string,
  leadName: string,
  phone: string,
  projectId: string | null,
): Promise<void> {
  try {
    const [salesUser, project] = await Promise.all([
      repo.findUser(salesId),
      projectId ? repo.findProject(projectId) : Promise.resolve(null),
    ]);
    if (!salesUser) return;

    repo
      .insertNotification({
        userId: salesUser.id,
        type: "lead_assigned",
        titleEn: "New Lead Assigned",
        bodyEn: `You have been assigned a new lead: ${leadName}.`,
        link: `/leads/${leadId}`,
      })
      .catch(() => {});

    sendLeadAssignedEmail(
      salesUser.email,
      salesUser.name,
      leadName,
      phone,
      project?.name ?? null,
      getAppUrl(req),
    ).catch(() => {});
  } catch (err) {
    logger.warn({ err }, "notifyAssignment failed");
  }
}

async function notifyStatusChange(
  req: Request,
  leadId: string,
  salesId: string,
  leadName: string,
  oldStatus: string,
  newStatus: string,
): Promise<void> {
  try {
    const salesUser = await repo.findUser(salesId);
    if (!salesUser) return;

    repo
      .insertNotification({
        userId: salesUser.id,
        type: newStatus === "won" ? "lead_won" : "lead_status_changed",
        titleEn: newStatus === "won" ? "Deal Closed! 🎉" : "Lead Status Updated",
        bodyEn: `${leadName} moved from ${oldStatus} to ${newStatus}.`,
        link: `/leads/${leadId}`,
      })
      .catch(() => {});

    sendLeadStatusChangedEmail(
      salesUser.email,
      salesUser.name,
      leadName,
      oldStatus,
      newStatus,
      getAppUrl(req),
    ).catch(() => {});
  } catch (err) {
    logger.warn({ err }, "notifyStatusChange failed");
  }
}
