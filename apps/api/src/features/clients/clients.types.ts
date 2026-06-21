import type { Client } from "@workspace/db";
export interface ClientWithRelations extends Client {
  projectName: string | null;
  assignedSalesName: string | null;
}
