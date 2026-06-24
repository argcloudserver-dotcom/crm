import { z } from "zod";
import { LEAD_STATUSES } from "./leads.types";

// FIX: UUID validation for route params
export const leadIdParams = z.object({
  leadId: z.string().uuid("Invalid lead ID format"),
});

export const listLeadsQuery = z.object({
  status: z.string().trim().max(50).optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(), // FIX: max length to prevent DoS
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(["createdAt", "updatedAt", "name", "deadline"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const createLeadBody = z.object({
  name: z.string().trim().min(1).max(200), // FIX: max length
  phone: z.string().trim().max(32).nullable().optional(), // FIX: max length
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(), // FIX: email validation
  source: z.string().trim().max(100).nullable().optional(), // FIX: max length
  status: z.enum(LEAD_STATUSES).default(LEAD_STATUSES[0]),
  projectId: z.string().uuid().nullable().optional(), // FIX: UUID validation
  notes: z.string().trim().max(5_000).nullable().optional(), // FIX: max length
  deadline: z.string().datetime().nullable().optional(), // FIX: datetime validation
  primarySalesId: z.string().uuid().nullable().optional(), // FIX: UUID validation
});

export const updateLeadBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  source: z.string().trim().max(100).nullable().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(5_000).nullable().optional(),
  nextAction: z.string().trim().max(500).nullable().optional(), // FIX: max length
  nextActionAt: z.string().datetime().nullable().optional(), // FIX: datetime validation
  deadline: z.string().datetime().nullable().optional(),
  primarySalesId: z.string().uuid().nullable().optional(),
  outcome: z.string().trim().max(1_000).nullable().optional(), // FIX: max length
});

export const assignLeadBody = z.object({
  salesId: z.string().uuid("Invalid sales ID format"), // FIX: UUID validation
});

export const updateLeadStatusBody = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const createActivityBody = z.object({
  type: z.string().trim().min(1).max(100), // FIX: max length
  notes: z.string().trim().max(5_000).nullable().optional(),
  outcome: z.string().trim().max(1_000).nullable().optional(),
  nextAction: z.string().trim().max(500).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(), // FIX: datetime validation
  duration: z.coerce.number().int().min(0).max(86400).nullable().optional(), // FIX: number validation (max 24h in seconds)
});

export type CreateLeadInput = z.infer<typeof createLeadBody>;
export type UpdateLeadInput = z.infer<typeof updateLeadBody>;
export type AssignLeadInput = z.infer<typeof assignLeadBody>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusBody>;
export type CreateActivityInput = z.infer<typeof createActivityBody>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuery>;
// Multi-assignment with role tracking (director/admin assign across roles).
const assignmentRoleEnum = z.enum(["director", "team_leader", "sales"]);

export const assignTargetSchema = z.object({
  userId: z.string().uuid(),
  role: assignmentRoleEnum,
});

export const multiAssignBody = z.object({
  targets: z.array(assignTargetSchema).min(1).max(50),
  note: z.string().trim().max(1000).nullable().optional(),
  setPrimary: z.boolean().optional(), // first sales target becomes primarySalesId
});

export type MultiAssignInput = z.infer<typeof multiAssignBody>;
export type AssignTarget = z.infer<typeof assignTargetSchema>;
