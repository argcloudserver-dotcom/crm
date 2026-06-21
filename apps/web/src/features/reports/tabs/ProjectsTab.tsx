import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building } from "lucide-react";
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
import { TIL, chartCursor, tooltipStyle } from "../constants";
import type { ProjectsReport } from "@workspace/core";

interface ProjectsTabProps {
  projectsReport: ProjectsReport | undefined;
  isProjectsLoading: boolean;
}

export function ProjectsTab({ projectsReport, isProjectsLoading }: ProjectsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>أداء المشاريع</CardTitle>
          <CardDescription>العملاء المحتملون ومعدلات التحويل حسب المشروع</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isProjectsLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(projectsReport?.projects ?? []).filter((p) => p.total > 0).slice(0, 8)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={chartCursor}
                  formatter={(v, name) => [
                    v,
                    name === "won" ? "رابح" : name === "lost" ? "خاسر" : name === "inProgress" ? "جاري" : String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "won" ? "رابح" : v === "lost" ? "خاسر" : "جاري")} />
                <Bar dataKey="won" name="won" stackId="a" fill={TIL.green} radius={[0, 0, 4, 4]} />
                <Bar dataKey="lost" name="lost" stackId="a" fill={TIL.red} />
                <Bar dataKey="inProgress" name="inProgress" stackId="a" fill={TIL.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل المشاريع</CardTitle>
        </CardHeader>
        <CardContent>
          {isProjectsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>المشروع</TableHead>
                  <TableHead className="text-center">إجمالي</TableHead>
                  <TableHead className="text-center">رابح</TableHead>
                  <TableHead className="text-center">خاسر</TableHead>
                  <TableHead className="text-end">معدل التحويل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(projectsReport?.projects ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                ) : (
                  (projectsReport?.projects ?? []).map((p, idx) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground text-sm">#{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-7 h-7 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                              <Building className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{p.total}</TableCell>
                      <TableCell className="text-center font-bold" style={{ color: TIL.green }}>{p.won}</TableCell>
                      <TableCell className="text-center font-medium" style={{ color: TIL.red }}>{p.lost}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.convRate}%`, backgroundColor: TIL.green }} />
                          </div>
                          <span className="font-bold text-sm tabular-nums">{p.convRate}%</span>
                        </div>
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
