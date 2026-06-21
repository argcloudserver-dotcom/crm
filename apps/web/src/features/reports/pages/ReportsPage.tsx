import { useMemo, useState } from "react";
import { format, startOfYear, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useGetLeadsReport, useGetSalesReport } from "@workspace/api-client";
import { Building, Home, TrendingUp, Trophy, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FUNNEL_STAGE_ORDER, PRESETS, STATUS_LABELS_AR } from "../constants";
import { ReportsHeader } from "../components/ReportsHeader";
import {
  useProjectsReportQuery,
  useResaleReportQuery,
  useTrendsReportQuery,
} from "@workspace/api-client/hooks/reports";
import { exportFullReportCsv, exportSalesReportCsv } from "../hooks/useReportExports";
import { SalesTab } from "../tabs/SalesTab";
import { TrendsTab } from "../tabs/TrendsTab";
import { LeadsTab } from "../tabs/LeadsTab";
import { ProjectsTab } from "../tabs/ProjectsTab";
import { ResaleTab } from "../tabs/ResaleTab";
import type { LeadStatusRow, SalesPerformer } from "@workspace/core";

export function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState(1);

  const fromDate = date?.from ? format(date.from, "yyyy-MM-dd") : undefined;
  const toDate = date?.to ? format(date.to, "yyyy-MM-dd") : undefined;

  const { data: salesReport, isLoading: isSalesLoading } = useGetSalesReport({ from: fromDate, to: toDate });
  const { data: leadsReport, isLoading: isLeadsLoading } = useGetLeadsReport({ from: fromDate, to: toDate });
  const { data: resaleReport, isLoading: isResaleLoading } = useResaleReportQuery(fromDate, toDate);
  const { data: trendsData, isLoading: isTrendsLoading } = useTrendsReportQuery(fromDate, toDate);
  const { data: projectsReport, isLoading: isProjectsLoading } = useProjectsReportQuery(fromDate, toDate);

  function applyPreset(idx: number) {
    setActivePreset(idx);
    const p = PRESETS[idx];
    if (p.days === -1) {
      setDate({ from: startOfYear(new Date()), to: new Date() });
    } else {
      setDate({ from: subDays(new Date(), p.days), to: new Date() });
    }
  }

  const sortedPerformers = useMemo<SalesPerformer[]>(
    () =>
      [...((salesReport?.byUser ?? []) as SalesPerformer[])].sort(
        (a, b) =>
          (b.won ?? 0) / Math.max(b.total ?? 0, 1) -
          (a.won ?? 0) / Math.max(a.total ?? 0, 1),
      ),
    [salesReport],
  );

  const pipelineFunnel = useMemo(() => {
    return FUNNEL_STAGE_ORDER.map((s) => ({
      name: STATUS_LABELS_AR[s] ?? s,
      value:
        ((leadsReport?.byStatus ?? []) as LeadStatusRow[]).find((x) => x.status === s)?.count ?? 0,
    })).filter((x) => x.value > 0);
  }, [leadsReport]);

  const trendDays = trendsData?.days ?? [];
  const showWeekly = trendDays.length > 60;
  const trendChart = useMemo(() => {
    if (!showWeekly) {
      return trendDays.map((d) => ({
        ...d,
        label: format(new Date(d.date), "d MMM"),
      }));
    }
    const weeks: Record<string, { label: string; total: number; won: number; lost: number }> = {};
    for (const d of trendDays) {
      const dt = new Date(d.date);
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dt.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { label: format(weekStart, "d MMM"), total: 0, won: 0, lost: 0 };
      weeks[key].total += d.total;
      weeks[key].won += d.won;
      weeks[key].lost += d.lost;
    }
    return Object.values(weeks);
  }, [trendDays, showWeekly]);

  const handleSalesExport = () =>
    exportSalesReportCsv({
      fromDate,
      toDate,
      salesByUser: salesReport?.byUser as SalesPerformer[] | undefined,
    });

  const handleFullExport = () =>
    exportFullReportCsv({
      fromDate,
      toDate,
      salesByUser: salesReport?.byUser as SalesPerformer[] | undefined,
      leadsBySource: leadsReport?.bySource,
      resaleByProject: resaleReport?.byProject,
    });

  return (
    <div className="space-y-6">
      <ReportsHeader
        date={date}
        onDateChange={setDate}
        activePreset={activePreset}
        onPreset={applyPreset}
        onClearPreset={() => setActivePreset(-1)}
        onExport={handleFullExport}
        exportDisabled={isSalesLoading || isLeadsLoading}
      />

      <Tabs defaultValue="sales">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="sales" className="gap-1.5"><Trophy className="h-3.5 w-3.5" /> أداء المبيعات</TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> الاتجاهات</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="h-3.5 w-3.5" /> العملاء المحتملون</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Building className="h-3.5 w-3.5" /> المشاريع</TabsTrigger>
          <TabsTrigger value="resale" className="gap-1.5"><Home className="h-3.5 w-3.5" /> إعادة البيع</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesTab
            salesReport={salesReport}
            isSalesLoading={isSalesLoading}
            sortedPerformers={sortedPerformers}
            onExport={handleSalesExport}
          />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab
            trendChart={trendChart}
            showWeekly={showWeekly}
            isTrendsLoading={isTrendsLoading}
            pipelineFunnel={pipelineFunnel}
            isLeadsLoading={isLeadsLoading}
          />
        </TabsContent>

        <TabsContent value="leads">
          <LeadsTab leadsReport={leadsReport} isLeadsLoading={isLeadsLoading} />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsTab projectsReport={projectsReport} isProjectsLoading={isProjectsLoading} />
        </TabsContent>

        <TabsContent value="resale">
          <ResaleTab resaleReport={resaleReport} isResaleLoading={isResaleLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
