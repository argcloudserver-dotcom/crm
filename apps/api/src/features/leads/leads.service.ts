import type { Request } from "express";
import {
  sendLeadAssignedEmail,
  sendLeadStatusChangedEmail,
} from "../../lib/email/lead-emails";
import { logger } from "../../lib/logger";
import { getAppUrl } from "../../shared/utils/getAppUrl";
import { getVisibleUserIds } from "../../shared/utils/scope";
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

export async function listLeads(
  req: Request,
  query: ListLeadsQuery,
): Promise<LeadWithRelations[]> {
  const viewer = req.currentUser!;
  const visibleIds = await getVisibleUserIds(viewer);
  const rows = await repo.findAllWithRelations(visibleIds);
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

export async function getKanban(req: Request): Promise<{
  columns: { status: LeadStatus; leads: LeadWithRelations[] }[];
}> {
  const viewer = req.currentUser!;
  const visibleIds = await getVisibleUserIds(viewer);
  const rows = await repo.findAllWithRelations(visibleIds);
  const enriched = rows.map(enrich);
  const columns = LEAD_STATUSES.map((status) => ({
    status,
    leads: enriched.filter((l) => l.status === status),
  }));
  return { columns };
}

export async function getLead(
  req: Request,
  leadId: string,
): Promise<LeadWithRelations | null> {
  const row = await repo.findByIdWithRelations(leadId);
  if (!row) return null;
  const visibleIds = await getVisibleUserIds(req.currentUser!);
  if (visibleIds !== null) {
    const owner = row.lead.primarySalesId;
    if (!owner || !visibleIds.includes(owner)) return null;
  }
  return enrich(row);
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
      updateData[f] = value === null ? null : value;
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
  const updated = await repo.updateById(leadId, { primarySalesId: input.salesId });
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
    lastActionAt: new Date(),
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
  await repo.updateById(leadId, { lastActionAt: new Date() });
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

const VALID_LEAD_SOURCES = [
  "manual",
  "import",
  "campaign",
  "referral",
  "website",
  "social",
] as const;
type ValidLeadSource = (typeof VALID_LEAD_SOURCES)[number];

const VALID_LEAD_STATUSES = [
  "new",
  "called",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
type ValidLeadStatus = (typeof VALID_LEAD_STATUSES)[number];

function coerceSource(raw: unknown): ValidLeadSource {
  const v = String(raw ?? "").trim().toLowerCase();
  return (VALID_LEAD_SOURCES as readonly string[]).includes(v)
    ? (v as ValidLeadSource)
    : "import";
}

function coerceStatus(raw: unknown): ValidLeadStatus {
  const v = String(raw ?? "").trim().toLowerCase();
  return (VALID_LEAD_STATUSES as readonly string[]).includes(v)
    ? (v as ValidLeadStatus)
    : "new";
}

export async function bulkImport(
  req: Request,
  rows: BulkImportRow[],
): Promise<BulkImportResult> {
  const currentUser = req.currentUser!;
  const errors: BulkImportResult["errors"] = [];
  const values: Parameters<typeof repo.bulkInsert>[0] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? {};
    const rowNum = i + 2;
    try {
      const name = String(row.Name ?? row.name ?? "").trim();
      if (!name) {
        errors.push({ row: rowNum, message: "Name is required" });
        continue;
      }
      const phoneRaw = String(row.Phone ?? row.phone ?? "").trim();
      const emailRaw = String(row.Email ?? row.email ?? "").trim();
      const notesRaw = String(row.Notes ?? row.notes ?? "").trim();
      values.push({
        name,
        phone: phoneRaw || null,
        email: emailRaw || null,
        source: coerceSource(row.Source ?? row.source),
        status: coerceStatus(row.Status ?? row.status),
        notes: notesRaw || null,
        createdBy: currentUser.id,
      });
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Invalid row",
      });
    }
  }

  let imported = 0;
  if (values.length > 0) {
    try {
      await repo.bulkInsert(values);
      imported = values.length;
    } catch (err) {
      // FIX: bulk insert failures used to surface as a 500 — fall back to
      // per-row inserts so the caller gets a partial-success report instead.
      logger.warn({ err }, "[leads.bulkImport] batch insert failed; retrying per row");
      for (let i = 0; i < values.length; i++) {
        try {
          await repo.bulkInsert([values[i]]);
          imported += 1;
        } catch (rowErr) {
          errors.push({
            row: i + 2,
            message:
              rowErr instanceof Error ? rowErr.message : "Insert failed",
          });
        }
      }
    }
  }
  return { imported, errors };
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

// ---------------------------------------------------------------------------
// Multi-target assignment with role tracking + history log.
// ---------------------------------------------------------------------------
import type { MultiAssignInput } from "./leads.schemas";

const ROLE_HIERARCHY: Record<string, string[]> = {
  // who each role is allowed to assign to (target roles)
  admin:       ["director", "team_leader", "sales"],
  ceo:         ["director", "team_leader", "sales"],
  director:    ["team_leader", "sales"],
  team_leader: ["sales"], // and only own team — enforced below
  sales:       [],
};

export async function multiAssignLead(
  req: Request,
  leadId: string,
  input: MultiAssignInput,
) {
  const viewer = req.currentUser!;
  const allowedRoles = ROLE_HIERARCHY[viewer.role] ?? [];

  const lead = await repo.findById(leadId);
  if (!lead) return null;

  // Visibility check for TL.
  const visible = await getVisibleUserIds(viewer);
  if (visible !== null && (!lead.primarySalesId || !visible.includes(lead.primarySalesId))) {
    // TL can still create-then-assign their own leads (primary null is created
    // via createLead in the same request) — but for an existing lead they
    // don't own, refuse.
    if (lead.primarySalesId) return { error: "forbidden" as const };
  }

  // Load target users and validate.
  const targetIds = [...new Set(input.targets.map((t) => t.userId))];
  const targetUsers = await repo.findUsersByIds(targetIds);
  const byId = new Map(targetUsers.map((u) => [u.id, u]));

  for (const t of input.targets) {
    const u = byId.get(t.userId);
    if (!u) return { error: "target_not_found" as const };
    if (u.role !== t.role) return { error: "role_mismatch" as const };
    if (!allowedRoles.includes(t.role)) return { error: "forbidden_role" as const };
    if (viewer.role === "team_leader" && u.teamLeaderId !== viewer.id) {
      return { error: "not_in_your_team" as const };
    }
  }

  // Insert history rows.
  const inserted = await repo.insertAssignments(
    input.targets.map((t) => ({
      leadId,
      assignedTo: t.userId,
      assignedToRole: t.role,
      assignedBy: viewer.id,
      assignmentType: "assign" as const,
      note: input.note ?? null,
      isActive: true,
    })),
  );

  // Optionally update primarySalesId to the first sales target.
  const firstSales = input.targets.find((t) => t.role === "sales");
  if (input.setPrimary !== false && firstSales) {
    await repo.updateById(leadId, { primarySalesId: firstSales.userId });
    // notify the new primary sales
    void notifyAssignment(
      req,
      leadId,
      firstSales.userId,
      lead.name,
      lead.phone ?? "N/A",
      lead.projectId,
    );
  }

  // Notify every other assignee (cheap fan-out).
  for (const t of input.targets) {
    if (firstSales && t.userId === firstSales.userId) continue;
    void notifyAssignment(
      req,
      leadId,
      t.userId,
      lead.name,
      lead.phone ?? "N/A",
      lead.projectId,
    );
  }

  return { count: inserted.length, assignments: inserted };
}

export async function listAssignmentHistory(leadId: string) {
  const rows = await repo.listAssignmentsWithUsers(leadId);
  return rows.map((r) => ({
    ...r.assignment,
    assignedToName: r.assignedToName ?? null,
  }));
}
