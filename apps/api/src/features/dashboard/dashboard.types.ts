export interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalClients: number;
  totalProjects: number;
  totalResaleUnits: number;
  onlineUsers: number;
  totalUsers: number;
}

export interface PipelineEntry {
  status: string;
  count: number;
  label: string;
}

export interface TopPerformer {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  wonLeads: number;
  totalLeads: number;
  conversionRate: number;
}

export interface RecentActivityEntry {
  id: string;
  leadId: string;
  leadName: string;
  userId: string;
  userName: string;
  type: string;
  notes: string | null;
  createdAt: Date;
}
