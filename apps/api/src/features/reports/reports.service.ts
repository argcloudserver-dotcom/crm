import * as repo from "./reports.repository";
import type { ReportsQuery } from "./reports.schemas";
import type {
  LeadsReport,
  ProjectReportEntry,
  ResaleReport,
  SalesReport,
  TrendDay,
} from "./reports.types";

function inRange<T extends { createdAt: Date }>(
  items: T[],
  query: ReportsQuery,
): T[] {
  let filtered = items;
  if (query.from) {
    const from = new Date(query.from);
    filtered = filtered.filter((i) => i.createdAt >= from);
  }
  if (query.to) {
    const to = new Date(query.to + "T23:59:59Z");
    filtered = filtered.filter((i) => i.createdAt <= to);
  }
  return filtered;
}

export async function buildSalesReport(query: ReportsQuery): Promise<SalesReport> {
  let leads = await repo.loadLeadsForSales();
  leads = inRange(leads, query);
  if (query.userId) leads = leads.filter((l) => l.salesId === query.userId);

  const users = await repo.activeUsers();
  const stats: Record<string, { won: number; lost: number; inProgress: number }> = {};
  for (const l of leads) {
    const sid = l.salesId ?? "__unassigned__";
    if (!stats[sid]) stats[sid] = { won: 0, lost: 0, inProgress: 0 };
    if (l.status === "won") stats[sid].won++;
    else if (l.status === "lost") stats[sid].lost++;
    else stats[sid].inProgress++;
  }

  const byUser = users
    .filter((u) => stats[u.id])
    .map((u) => {
      const s = stats[u.id]!;
      return {
        userId: u.id,
        userName: u.name,
        avatarUrl: u.avatarUrl,
        role: u.role,
        won: s.won,
        lost: s.lost,
        inProgress: s.inProgress,
        total: s.won + s.lost + s.inProgress,
      };
    });

  return {
    totalWon: leads.filter((l) => l.status === "won").length,
    totalLost: leads.filter((l) => l.status === "lost").length,
    totalLeads: leads.length,
    byUser,
  };
}

export async function buildLeadsReport(query: ReportsQuery): Promise<LeadsReport> {
  let leads = await repo.loadLeadsForReport();
  leads = inRange(leads, query);
  if (query.userId) leads = leads.filter((l) => l.salesId === query.userId);

  const sourceCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const l of leads) {
    const src = l.source ?? "manual";
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  }

  return {
    total: leads.length,
    bySource: Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
    })),
    byStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

export async function buildResaleReport(
  query: ReportsQuery,
): Promise<ResaleReport> {
  let units = await repo.loadResaleUnits();
  units = inRange(units, query);

  const typeCounts: Record<string, number> = {};
  const projectCounts: Record<string, { count: number; totalValue: number }> = {};
  let totalValue = 0;
  let activeCount = 0;

  for (const u of units) {
    const type = u.unitType ?? "other";
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    const proj = u.projectName;
    if (!projectCounts[proj]) projectCounts[proj] = { count: 0, totalValue: 0 };
    projectCounts[proj].count++;
    const price = parseFloat(u.price ?? "0");
    if (!Number.isNaN(price)) {
      projectCounts[proj].totalValue += price;
      totalValue += price;
    }
    if (u.isActive) activeCount++;
  }

  return {
    total: units.length,
    activeCount,
    inactiveCount: units.length - activeCount,
    totalValue,
    byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    byProject: Object.entries(projectCounts)
      .map(([project, data]) => ({
        project,
        count: data.count,
        totalValue: data.totalValue,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function buildTrendsReport(
  query: ReportsQuery,
): Promise<{ days: TrendDay[] }> {
  const fromDate = query.from
    ? new Date(query.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = query.to ? new Date(query.to + "T23:59:59Z") : new Date();

  const rows = await repo.loadDailyTrends({
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    userId: query.userId,
  });

  const map: Record<string, TrendDay> = {};
  for (const r of rows) {
    map[r.date] = {
      date: r.date,
      total: Number(r.total),
      won: Number(r.won),
      lost: Number(r.lost),
      inProgress: Number(r.in_progress),
    };
  }

  const days: TrendDay[] = [];
  const cur = new Date(fromDate);
  while (cur <= toDate) {
    const key = cur.toISOString().slice(0, 10);
    days.push(map[key] ?? { date: key, total: 0, won: 0, lost: 0, inProgress: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return { days };
}

export async function buildProjectsReport(
  query: ReportsQuery,
): Promise<{ projects: ProjectReportEntry[] }> {
  const fromDate = query.from ? new Date(query.from) : new Date(0);
  const toDate = query.to ? new Date(query.to + "T23:59:59Z") : new Date();

  const rows = await repo.loadProjectsReport({
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
    userId: query.userId,
  });

  const projects = rows.map((r) => {
    const total = Number(r.total);
    const won = Number(r.won);
    return {
      id: r.id,
      name: r.name,
      imageUrl: r.imageUrl,
      total,
      won,
      lost: Number(r.lost),
      inProgress: Number(r.in_progress),
      convRate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  });
  return { projects };
}
