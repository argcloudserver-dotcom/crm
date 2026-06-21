/**
 * Domain primitives for the Reports feature.
 *
 * Pure TypeScript types & label maps shared between web/mobile. UI-only
 * helpers (chart palette, CSS tooltips, CSV download) stay in the web app.
 */

export interface ResaleReport {
  total: number;
  activeCount: number;
  inactiveCount: number;
  totalValue: number;
  byType: { type: string; count: number }[];
  byProject: { project: string; count: number; totalValue: number }[];
}

export interface TrendsReport {
  days: {
    date: string;
    total: number;
    won: number;
    lost: number;
    inProgress: number;
  }[];
}

export interface ProjectsReport {
  projects: {
    id: string;
    name: string;
    imageUrl?: string;
    total: number;
    won: number;
    lost: number;
    inProgress: number;
    convRate: number;
  }[];
}

export interface SalesPerformer {
  userId: string;
  userName: string;
  total?: number;
  won?: number;
  lost?: number;
  inProgress?: number;
}

export interface LeadStatusRow {
  status: string;
  count: number;
}

export interface LeadSourceRow {
  source: string;
  count: number;
}

export const REPORT_STATUS_LABELS_AR: Record<string, string> = {
  new: "جديد",
  called: "تم الاتصال",
  qualified: "مؤهل",
  proposal: "عرض سعر",
  negotiation: "تفاوض",
  won: "فائز",
  lost: "خسارة",
};

export const REPORT_SOURCE_LABELS_AR: Record<string, string> = {
  manual: "يدوي",
  import: "استيراد",
  campaign: "حملة",
  referral: "توصية",
  website: "موقع إلكتروني",
  social: "تواصل اجتماعي",
};

export const REPORT_FUNNEL_STAGE_ORDER = [
  "new",
  "called",
  "qualified",
  "proposal",
  "negotiation",
  "won",
] as const;
