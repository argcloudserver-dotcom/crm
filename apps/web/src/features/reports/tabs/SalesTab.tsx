import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, Flame, Trophy, Target, Users, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { cn } from "@/shared/utils/utils";
import { TIL, MEDALS, tooltipStyle, chartCursor } from "../constants";
import type { SalesPerformer } from "@workspace/core";

interface SalesTabProps {
  salesReport: {
    totalLeads?: number;
    totalWon?: number;
    totalLost?: number;
    byUser?: SalesPerformer[];
  } | undefined;
  isSalesLoading: boolean;
  sortedPerformers: SalesPerformer[];
  onExport: () => void;
}

export function SalesTab({ salesReport, isSalesLoading, sortedPerformers, onExport }: SalesTabProps) {
  const kpis = [
    {
      label: "إجمالي العملاء",
      value: salesReport?.totalLeads ?? 0,
      icon: Users,
      color: "text-[#4A8FD4]",
      bg: "bg-[#4A8FD4]/10",
    },
    {
      label: "صفقات رابحة",
      value: salesReport?.totalWon ?? 0,
      icon: Trophy,
      color: "text-[#22C59A]",
      bg: "bg-[#22C59A]/10",
    },
    {
      label: "صفقات خاسرة",
      value: salesReport?.totalLost ?? 0,
      icon: Target,
      color: "text-[#E05555]",
      bg: "bg-[#E05555]/10",
    },
    {
      label: "معدل التحويل",
      value:
        (salesReport?.totalLeads ?? 0) > 0
          ? `${(((salesReport?.totalWon ?? 0) / (salesReport?.totalLeads ?? 1)) * 100).toFixed(1)}%`
          : "0%",
      icon: BarChart3,
      color: "text-[#C9A84C]",
      bg: "bg-[#C9A84C]/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                {isSalesLoading ? (
                  <Skeleton className="h-7 w-12 mb-0.5" />
                ) : (
                  <p className="text-2xl font-bold">{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>أداء الفريق</CardTitle>
            <CardDescription>الصفقات الرابحة / الخاسرة / الجارية لكل مندوب</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={isSalesLoading}
            className="h-8 px-2 gap-1.5 text-muted-foreground"
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isSalesLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesReport?.byUser ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="userName" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={chartCursor} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === "won" ? "رابح" : v === "lost" ? "خاسر" : "جاري"} />
                <Bar dataKey="won" name="won" stackId="a" fill={TIL.green} radius={[0, 0, 4, 4]} />
                <Bar dataKey="lost" name="lost" stackId="a" fill={TIL.red} />
                <Bar dataKey="inProgress" name="inProgress" stackId="a" fill={TIL.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>لوحة الشرف 🏆</CardTitle>
            <CardDescription>مرتبون حسب معدل التحويل</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isSalesLoading || !salesReport?.byUser?.length}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> تصدير
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>المندوب</TableHead>
                <TableHead className="text-center">إجمالي</TableHead>
                <TableHead className="text-center">رابح</TableHead>
                <TableHead className="text-center">خاسر</TableHead>
                <TableHead className="text-center">جاري</TableHead>
                <TableHead className="text-end">معدل التحويل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSalesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sortedPerformers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    لا توجد بيانات للفترة المختارة
                  </TableCell>
                </TableRow>
              ) : (
                sortedPerformers.map((perf, idx) => {
                  const rate = (perf.total ?? 0) > 0
                    ? (((perf.won ?? 0) / (perf.total ?? 1)) * 100).toFixed(1)
                    : "0.0";
                  const pct = Math.min(parseFloat(rate), 100);
                  return (
                    <TableRow key={perf.userId} className={cn(idx === 0 ? "bg-[#C9A84C]/5 dark:bg-[#C9A84C]/5" : "")}>
                      <TableCell className="font-bold text-base w-12">
                        {MEDALS[idx] ?? <span className="text-muted-foreground text-sm font-medium">#{idx + 1}</span>}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={perf.userName} />
                          <span>{perf.userName}</span>
                          {idx === 0 && <Flame className="w-4 h-4 text-[#C9A84C]" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{perf.total ?? 0}</TableCell>
                      <TableCell className="text-center font-bold" style={{ color: TIL.green }}>{perf.won ?? 0}</TableCell>
                      <TableCell className="text-center font-medium" style={{ color: TIL.red }}>{perf.lost ?? 0}</TableCell>
                      <TableCell className="text-center font-medium" style={{ color: TIL.amber }}>{perf.inProgress ?? 0}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 50 ? TIL.green : pct >= 25 ? TIL.gold : TIL.red,
                              }}
                            />
                          </div>
                          <span
                            className="font-bold text-sm tabular-nums"
                            style={{ color: pct >= 50 ? TIL.green : pct >= 25 ? TIL.gold : TIL.red }}
                          >
                            {rate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
