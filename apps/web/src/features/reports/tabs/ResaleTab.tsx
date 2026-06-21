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
import { ArrowDownRight, ArrowUpRight, Building, Home, Target } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
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
import { CHART_COLORS, TIL, chartCursor, tooltipStyle } from "../constants";
import { formatPrice } from "../utils";
import type { ResaleReport } from "@workspace/core";

interface ResaleTabProps {
  resaleReport: ResaleReport | undefined;
  isResaleLoading: boolean;
}

export function ResaleTab({ resaleReport, isResaleLoading }: ResaleTabProps) {
  const kpis = [
    { label: "إجمالي الوحدات", value: resaleReport?.total ?? 0, icon: Home, color: TIL.blue },
    { label: "وحدات متاحة", value: resaleReport?.activeCount ?? 0, icon: ArrowUpRight, color: TIL.green },
    { label: "وحدات غير نشطة", value: resaleReport?.inactiveCount ?? 0, icon: ArrowDownRight, color: TIL.amber },
    {
      label: "قيمة المحفظة",
      value: resaleReport?.totalValue ? formatPrice(resaleReport.totalValue) : "ج.م ٠",
      icon: Target,
      color: TIL.gold,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${kpi.color}18` }}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
              <div>
                {isResaleLoading ? (
                  <Skeleton className="h-7 w-16 mb-0.5" />
                ) : (
                  <p className="text-lg font-bold">{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الوحدات حسب النوع</CardTitle>
            <CardDescription>توزيع أنواع العقارات</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isResaleLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resaleReport?.byType ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="type"
                    label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(resaleReport?.byType ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أبرز المشاريع (إعادة البيع)</CardTitle>
            <CardDescription>المشاريع الأكثر وحدات</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isResaleLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resaleReport?.byProject?.slice(0, 6) ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="project" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={tooltipStyle} cursor={chartCursor} formatter={(v) => [`${v} وحدة`, "العدد"]} />
                  <Bar dataKey="count" name="الوحدات" fill={TIL.gold} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إعادة البيع حسب المشروع</CardTitle>
          <CardDescription>عدد الوحدات والقيمة الإجمالية</CardDescription>
        </CardHeader>
        <CardContent>
          {isResaleLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>المشروع</TableHead>
                  <TableHead className="text-center">الوحدات</TableHead>
                  <TableHead className="text-end">قيمة المحفظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(resaleReport?.byProject ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      لا توجد وحدات إعادة بيع للفترة المختارة
                    </TableCell>
                  </TableRow>
                ) : (
                  (resaleReport?.byProject ?? []).map((p, idx) => (
                    <TableRow key={p.project}>
                      <TableCell className="text-muted-foreground">#{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                          {p.project}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.count}</Badge>
                      </TableCell>
                      <TableCell className="text-end font-medium">
                        {p.totalValue > 0 ? formatPrice(p.totalValue) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
