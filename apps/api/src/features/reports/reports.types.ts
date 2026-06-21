export interface SalesByUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  role: string;
  won: number;
  lost: number;
  inProgress: number;
  total: number;
}

export interface SalesReport {
  totalWon: number;
  totalLost: number;
  totalLeads: number;
  byUser: SalesByUser[];
}

export interface LeadsReport {
  total: number;
  bySource: Array<{ source: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export interface ResaleReport {
  total: number;
  activeCount: number;
  inactiveCount: number;
  totalValue: number;
  byType: Array<{ type: string; count: number }>;
  byProject: Array<{ project: string; count: number; totalValue: number }>;
}

export interface TrendDay {
  date: string;
  total: number;
  won: number;
  lost: number;
  inProgress: number;
}

export interface ProjectReportEntry {
  id: string;
  name: string;
  imageUrl: string | null;
  total: number;
  won: number;
  lost: number;
  inProgress: number;
  convRate: number;
}
