import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ar as arDateLocale } from "date-fns/locale";
import { History, UserCheck, Briefcase, UserCog, Users } from "lucide-react";

import { apiFetch } from "@workspace/api-client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface AssignmentHistoryEntry {
  id: string;
  leadId: string;
  assignedTo: string;
  assignedToName: string | null;
  assignedToRole: string | null;
  assignedBy: string | null;
  assignmentType: string;
  note: string | null;
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
}

const ROLE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  director: { label: "Director", icon: Briefcase, cls: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  team_leader: { label: "Team Leader", icon: UserCog, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  sales: { label: "Sales", icon: Users, cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
};

export interface LeadAssignmentTimelineProps {
  leadId: string;
  isAr?: boolean;
  users?: Array<{ id: string; name: string }>;
}

export function LeadAssignmentTimeline({ leadId, isAr, users = [] }: LeadAssignmentTimelineProps) {
  const { data = [], isLoading } = useQuery<AssignmentHistoryEntry[]>({
    queryKey: ["lead-assignments", leadId],
    queryFn: async () => {
      const res = await apiFetch(`/api/leads/${leadId}/assignments`);
      if (!res.ok) throw new Error("Failed to load assignment history");
      const json = await res.json();
      return (json.data ?? json) as AssignmentHistoryEntry[];
    },
    enabled: !!leadId,
  });

  const lookupName = (id: string | null | undefined) =>
    id ? users.find((u) => u.id === id)?.name ?? "—" : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Assignment History
        </CardTitle>
        <CardDescription>
          Full track of who assigned this lead, to whom, and when
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No assignment history yet
          </div>
        ) : (
          <div className="relative border-l border-muted ml-3 space-y-5 pb-2">
            {data.map((entry) => {
              const meta = ROLE_META[entry.assignedToRole ?? ""] ?? {
                label: entry.assignedToRole ?? "user",
                icon: UserCheck,
                cls: "bg-muted text-muted-foreground border",
              };
              const Icon = meta.icon;
              return (
                <div key={entry.id} className="relative pl-6">
                  <span className="absolute -left-3.5 top-1 bg-background border border-muted p-1 rounded-full text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="bg-muted/30 border rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">
                          {lookupName(entry.assignedBy)}
                        </span>
                        <span className="text-muted-foreground">assigned to</span>
                        <span className="font-semibold">
                          {entry.assignedToName ?? lookupName(entry.assignedTo)}
                        </span>
                        <Badge variant="outline" className={meta.cls}>
                          {meta.label}
                        </Badge>
                        {!entry.isActive && (
                          <Badge variant="secondary">unassigned</Badge>
                        )}
                      </div>
                      <span
                        className="text-xs text-muted-foreground shrink-0"
                        title={format(new Date(entry.assignedAt), "PPpp")}
                      >
                        {formatDistanceToNow(new Date(entry.assignedAt), {
                          addSuffix: true,
                          locale: isAr ? arDateLocale : undefined,
                        })}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs bg-background border rounded px-2 py-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
