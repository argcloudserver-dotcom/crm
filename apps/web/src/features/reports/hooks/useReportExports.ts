import { SOURCE_LABELS_AR } from "../constants";
import type { LeadSourceRow, ResaleReport, SalesPerformer } from "@workspace/core";
import { downloadCsv } from "../utils";

interface ExportContext {
  fromDate?: string;
  toDate?: string;
  salesByUser?: SalesPerformer[];
  leadsBySource?: LeadSourceRow[];
  resaleByProject?: ResaleReport["byProject"];
}

export function exportSalesReportCsv({ fromDate, toDate, salesByUser }: ExportContext) {
  if (!salesByUser) return;
  const rows: string[][] = [
    ["الموظف", "إجمالي", "فائز", "خسارة", "جاري", "معدل التحويل (%)"],
    ...salesByUser.map((p) => [
      p.userName,
      String(p.total ?? 0),
      String(p.won ?? 0),
      String(p.lost ?? 0),
      String(p.inProgress ?? 0),
      (p.total ?? 0) > 0
        ? (((p.won ?? 0) / (p.total ?? 1)) * 100).toFixed(1)
        : "0.0",
    ]),
  ];
  downloadCsv(rows, `sales-report-${fromDate}-to-${toDate}.csv`);
}

export function exportFullReportCsv({
  fromDate,
  toDate,
  salesByUser,
  leadsBySource,
  resaleByProject,
}: ExportContext) {
  const rows: string[][] = [
    [`TIL Real Estate Group — تقرير شامل (${fromDate} → ${toDate})`],
    [],
    ["=== أداء المبيعات ==="],
    ["الموظف", "إجمالي", "فائز", "خسارة", "جاري", "معدل التحويل (%)"],
    ...(salesByUser ?? []).map((p) => [
      p.userName,
      String(p.total ?? 0),
      String(p.won ?? 0),
      String(p.lost ?? 0),
      String(p.inProgress ?? 0),
      (p.total ?? 0) > 0
        ? (((p.won ?? 0) / (p.total ?? 1)) * 100).toFixed(1)
        : "0.0",
    ]),
    [],
    ["=== مصادر العملاء ==="],
    ["المصدر", "العدد"],
    ...(leadsBySource ?? []).map((s) => [
      SOURCE_LABELS_AR[s.source] ?? s.source,
      String(s.count),
    ]),
    [],
    ["=== وحدات إعادة البيع ==="],
    ["المشروع", "الوحدات", "القيمة الإجمالية (ج.م)"],
    ...(resaleByProject ?? []).map((p) => [p.project, String(p.count), String(p.totalValue)]),
  ];
  downloadCsv(rows, `full-report-${fromDate}-to-${toDate}.csv`);
}
