import type { Request } from "express";
import { auditLog } from "../../lib/audit";
import * as repo from "./delays.repository";
import type { CreateDelayInput, ReviewDelayInput } from "./delays.schemas";

export async function listPendingDelays() {
  const rows = await repo.findPendingWithRelations();
  return rows.map((d) => ({
    ...d.delay,
    leadName: d.leadName,
    requesterName: d.requesterName,
  }));
}

export type RequestDelayResult =
  | { ok: true; delay: Awaited<ReturnType<typeof repo.insertDelay>> }
  | { ok: false; status: number; reason: string };

export async function requestDelay(
  req: Request,
  leadId: string,
  input: CreateDelayInput,
): Promise<RequestDelayResult> {
  const currentUser = req.currentUser!;
  const lead = await repo.findLead(leadId);
  if (!lead) return { ok: false, status: 404, reason: "Lead not found" };

  const delay = await repo.insertDelay({
    leadId,
    requestedBy: currentUser.id,
    reason: input.reason,
    delayUntil: new Date(input.delayUntil),
  });

  const admins = await repo.findAdmins();
  await repo.insertNotifications(
    admins.map((a) => ({
      userId: a.id,
      titleEn: "Delay Request",
      bodyEn: `${currentUser.name} requested a delay for lead "${lead.name}"`,
      type: "delay_request",
      metadata: { relatedId: leadId },
    })),
  );

  await auditLog({
    userId: currentUser.id,
    action: "request_lead_delay",
    entityType: "lead",
    entityId: leadId,
    after: { reason: input.reason, delayUntil: input.delayUntil },
    req,
  });

  return { ok: true, delay };
}

export type ReviewResult =
  | { ok: true; delay: Awaited<ReturnType<typeof repo.reviewDelay>> }
  | { ok: false; reason: string };

export async function reviewDelay(
  req: Request,
  delayId: string,
  input: ReviewDelayInput,
): Promise<ReviewResult> {
  const currentUser = req.currentUser!;
  const delay = await repo.reviewDelay(delayId, {
    status: input.status,
    reviewedBy: currentUser.id,
    reviewedAt: new Date(),
    reviewNote: input.reviewNote ?? null,
  });
  if (!delay) return { ok: false, reason: "Delay not found" };

  if (input.status === "approved") {
    await repo.updateLeadDelayedUntil(delay.leadId, delay.delayUntil);
  }

  await repo.insertNotifications([
    {
      userId: delay.requestedBy,
      titleEn: input.status === "approved" ? "Delay Approved" : "Delay Rejected",
      bodyEn:
        input.status === "approved"
          ? `Your delay request was approved until ${delay.delayUntil.toLocaleDateString()}`
          : `Your delay request was rejected. ${input.reviewNote ?? ""}`,
      type: "delay_request",
      metadata: { relatedId: delay.leadId },
    },
  ]);

  await auditLog({
    userId: currentUser.id,
    action: `delay_${input.status}`,
    entityType: "lead_delay",
    entityId: delayId,
    after: { status: input.status, reviewNote: input.reviewNote },
    req,
  });

  return { ok: true, delay };
}
