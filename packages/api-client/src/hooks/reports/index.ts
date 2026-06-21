/**
 * React Query hooks + raw fetchers for the Reports feature.
 *
 * Platform-agnostic: relies only on `@tanstack/react-query` and the shared
 * `apiFetch` helper. Web and mobile reports surfaces consume these directly.
 */
import { useQuery } from "@tanstack/react-query";
import type {
  ProjectsReport,
  ResaleReport,
  TrendsReport,
} from "@workspace/core";
import { apiFetch } from "../../index";

function buildRangeQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params.toString();
}

export async function fetchResaleReport(
  from?: string,
  to?: string,
): Promise<ResaleReport> {
  const res = await apiFetch(`/api/reports/resale?${buildRangeQuery(from, to)}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<ResaleReport>;
}

export async function fetchTrendsReport(
  from?: string,
  to?: string,
): Promise<TrendsReport> {
  const res = await apiFetch(`/api/reports/trends?${buildRangeQuery(from, to)}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<TrendsReport>;
}

export async function fetchProjectsReport(
  from?: string,
  to?: string,
): Promise<ProjectsReport> {
  const res = await apiFetch(
    `/api/reports/projects?${buildRangeQuery(from, to)}`,
  );
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<ProjectsReport>;
}

export function useResaleReportQuery(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ["reports", "resale", fromDate, toDate],
    queryFn: () => fetchResaleReport(fromDate, toDate),
  });
}

export function useTrendsReportQuery(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ["reports", "trends", fromDate, toDate],
    queryFn: () => fetchTrendsReport(fromDate, toDate),
  });
}

export function useProjectsReportQuery(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ["reports", "projects", fromDate, toDate],
    queryFn: () => fetchProjectsReport(fromDate, toDate),
  });
}
