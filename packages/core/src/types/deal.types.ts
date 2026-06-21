export type DealStage = "new" | "qualified" | "proposal" | "won" | "lost";
export interface Deal {
  id: string;
  title: string;
  amount: number;
  stage: DealStage;
  contactId: string;
  createdAt: string;
  updatedAt: string;
}
