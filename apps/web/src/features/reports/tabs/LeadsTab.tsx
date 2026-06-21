import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  CHART_COLORS,
  SOURCE_LABELS_AR,
  STATUS_LABELS_AR,
  TIL,
  chartCursor,
  tooltipStyle,
} from "../constants";
import type { LeadSourceRow, LeadStatusRow } from "@workspace/core";

interface LeadsTabProps {
  leadsReport: {
    total?: number;
    bySource?: LeadSourceRow[];
    byStatus?: LeadStatusRow[];
  } | undefined;
  isLeadsLoading: boolean;
}

export function LeadsTab({ leadsReport, isLeadsLoading }: LeadsTabProps) {
  const topSource =
    (leadsReport?.bySource ?? []).length > 0
      ? SOURCE_LABELS_AR[
          [...(leadsReport!.bySource ?? [])].sort((a, b) => b.count - a.count)[0]?.source
        ] ?? "—"
      : "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TIL.blue}18` }}>
              <Users className="w-5 h-5" style={{ color: TIL.blue }} />
            </div>
            <div>
              {isLeadsLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{leadsReport?.total ?? 0}</p>}
              <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TIL.green}18` }}>
              <Trophy className="w-5 h-5" style={{ color: TIL.green }} />
            </div>
            <div>
              {isLeadsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">
                  {(leadsReport?.byStatus ?? []).find((x) => x.status === "won")?.count ?? 0}
                </p>
              )}
              <p className="text-xs text-muted-foreground">صفقات مغلقة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm md:col-span-1 col-span-2">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TIL.gold}18` }}>
              <BarChart3 className="w-5 h-5" style={{ color: TIL.gold }} />
            </div>
            <div>
              {isLeadsLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{topSource}</p>}
              <p className="text-xs text-muted-foreground">المصدر الأكثر</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>مصادر العملاء</CardTitle>
            <CardDescription>من أين يأتي العملاء المحتملون</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLeadsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(leadsReport?.bySource ?? []).map((x) => ({
                      ...x,
                      name: SOURCE_LABELS_AR[x.source] ?? x.source,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={115}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(leadsReport?.bySource ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} عميل`, "العدد"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع حالات العملاء</CardTitle>
            <CardDescription>نسبة كل مرحلة من المراحل</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLeadsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(leadsReport?.byStatus ?? []).map((x) => ({
                    ...x,
                    nameAr: STATUS_LABELS_AR[x.status] ?? x.status,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nameAr" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={chartCursor} formatter={(v) => [`${v} عميل`, "العدد"]} />
                  <Bar dataKey="count" name="عدد العملاء" fill={TIL.navyLight} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جدول تفصيلي</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">العدد</TableHead>
                <TableHead className="text-end">النسبة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leadsReport?.byStatus ?? []).map((s) => (
                <TableRow key={s.status}>
                  <TableCell className="font-medium">{STATUS_LABELS_AR[s.status] ?? s.status}</TableCell>
                  <TableCell className="text-center">{s.count}</TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: leadsReport?.total ? `${(s.count / leadsReport.total) * 100}%` : "0",
                            backgroundColor: TIL.gold,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {leadsReport?.total ? `${((s.count / leadsReport.total) * 100).toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leadsReport?.total ? (
                <TableRow className="font-bold border-t-2">
                  <TableCell>الإجمالي</TableCell>
                  <TableCell className="text-center">{leadsReport.total}</TableCell>
                  <TableCell className="text-end">100%</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
