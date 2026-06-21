import * as repo from "./dashboard.repository";
import type {
  DashboardStats,
  PipelineEntry,
  RecentActivityEntry,
  TopPerformer,
} from "./dashboard.types";

const PIPELINE_LABELS: Record<string, string> = {
  new: "New",
  called: "Called",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const PIPELINE_ORDER = [
  "new",
  "called",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export async function getStats(): Promise<DashboardStats> {
  const [leads, users, projects, resaleUnits, clients] = await repo.loadStatsRaw();
  return {
    totalLeads: leads.length,
    activeLeads: leads.filter((l) => !["won", "lost"].includes(l.status)).length,
    wonLeads: leads.filter((l) => l.status === "won").length,
    lostLeads: leads.filter((l) => l.status === "lost").length,
    totalClients: clients.length,
    totalProjects: projects.length,
    totalResaleUnits: resaleUnits.length,
    onlineUsers: users.filter((u) => u.isOnline).length,
    totalUsers: users.filter((u) => u.status === "active").length,
  };
}

export async function getPipeline(): Promise<PipelineEntry[]> {
  const leads = await repo.leadStatuses();
  const counts: Record<string, number> = {};
  for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
  return PIPELINE_ORDER.map((status) => ({
    status,
    count: counts[status] ?? 0,
    label: PIPELINE_LABELS[status] ?? status,
  }));
}

export async function getTopPerformers(): Promise<TopPerformer[]> {
  const [leads, users] = await Promise.all([
    repo.leadsBySales(),
    repo.activeUsers(),
  ]);

  const stats: Record<string, { won: number; total: number }> = {};
  for (const l of leads) {
    if (!l.salesId) continue;
    if (!stats[l.salesId]) stats[l.salesId] = { won: 0, total: 0 };
    stats[l.salesId].total++;
    if (l.status === "won") stats[l.salesId].won++;
  }

  return users
    .filter((u) => stats[u.id])
    .map((u) => {
      const s = stats[u.id]!;
      return {
        userId: u.id,
        userName: u.name,
        avatarUrl: u.avatarUrl,
        wonLeads: s.won,
        totalLeads: s.total,
        conversionRate:
          s.total > 0 ? Math.round((s.won / s.total) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.wonLeads - a.wonLeads)
    .slice(0, 10);
}

export async function getRecentActivity(): Promise<RecentActivityEntry[]> {
  const rows = await repo.recentActivities();
  return rows
    .sort(
      (a, b) =>
        new Date(b.activity.createdAt).getTime() -
        new Date(a.activity.createdAt).getTime(),
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.activity.id,
      leadId: r.activity.leadId,
      leadName: r.leadName ?? "Unknown Lead",
      userId: r.activity.userId,
      userName: r.userName ?? "Unknown User",
      type: r.activity.type,
      notes: r.activity.notes,
      createdAt: r.activity.createdAt,
    }));
}
