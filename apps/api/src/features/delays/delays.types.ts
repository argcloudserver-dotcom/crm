export type { CreateDelayInput, ReviewDelayInput } from "./delays.schemas";

export interface DelayRecord {
  id: string;
  leadId: string;
  reason: string;
  delayUntil: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string | null;
  createdAt: string;
}
