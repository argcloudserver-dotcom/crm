import {
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TIL, FUNNEL_COLORS, tooltipStyle } from "../constants";

interface TrendsTabProps {
  trendChart: { label: string; total: number; won: number; lost: number }[];
  showWeekly: boolean;
  isTrendsLoading: boolean;
  pipelineFunnel: { name: string; value: number }[];
  isLeadsLoading: boolean;
}

export function TrendsTab({
  trendChart,
  showWeekly,
  isTrendsLoading,
  pipelineFunnel,
  isLeadsLoading,
}: TrendsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>اتجاه العملاء المحتملين {showWeekly ? "(أسبوعي)" : "(يومي)"}</CardTitle>
          <CardDescription>إجمالي العملاء الجدد خلال الفترة المختارة</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          {isTrendsLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TIL.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={TIL.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TIL.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={TIL.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: TIL.gold, strokeWidth: 1.5, strokeDasharray: "4 2" }}
                  formatter={(v, name) => [
                    v,
                    name === "total" ? "إجمالي" : name === "won" ? "رابح" : name === "lost" ? "خاسر" : String(name),
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(v) => (v === "total" ? "إجمالي" : v === "won" ? "رابح" : "خاسر")}
                />
                <Area type="monotone" dataKey="total" name="total" stroke={TIL.blue} strokeWidth={2} fill="url(#gradTotal)" dot={false} />
                <Area type="monotone" dataKey="won" name="won" stroke={TIL.green} strokeWidth={2} fill="url(#gradWon)" dot={false} />
                <Area type="monotone" dataKey="lost" name="lost" stroke={TIL.red} strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مسار التحويل (Funnel)</CardTitle>
          <CardDescription>مراحل العملاء المحتملين من البداية حتى الإغلاق</CardDescription>
        </CardHeader>
        <CardContent>
          {isLeadsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-2.5">
              {pipelineFunnel.map((stage, idx) => {
                const maxVal = pipelineFunnel[0]?.value ?? 1;
                const pct = Math.round((stage.value / maxVal) * 100);
                const color = FUNNEL_COLORS[idx] ?? TIL.gold;
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {stage.value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-8 bg-muted/60 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          minWidth: stage.value > 0 ? "2rem" : 0,
                          backgroundColor: color,
                        }}
                      >
                        {pct > 15 && (
                          <span className="text-white text-xs font-bold drop-shadow">{stage.value}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pipelineFunnel.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">لا توجد بيانات للفترة المختارة</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
