import { z } from "zod";

export const userIdParams = z.object({ userId: z.string().min(1) });

export const listUsersQuery = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
});

export const updateUserBody = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  teamLeaderId: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
});

export const rejectUserBody = z.object({
  reason: z.string().optional(),
});

export const changeRoleBeforeApprovalBody = z.object({
  newRole: z.enum(["admin", "ceo", "director", "team_leader", "sales"]),
  teamLeaderId: z.string().uuid().nullable().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;
export type RejectUserInput = z.infer<typeof rejectUserBody>;
export type ChangeRoleBeforeApprovalInput = z.infer<typeof changeRoleBeforeApprovalBody>;
