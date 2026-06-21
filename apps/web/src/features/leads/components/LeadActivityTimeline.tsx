import { format, formatDistanceToNow } from "date-fns";
import { ar as arDateLocale } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Clock, FileText, Mail, MessageCircle, Phone,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { TFunc } from "@workspace/core";

function getActivityIcon(type: string) {
  switch (type) {
    case "call":    return <Phone className="h-4 w-4" />;
    case "meeting": return <CalendarIcon className="h-4 w-4" />;
    case "email":   return <Mail className="h-4 w-4" />;
    case "message": return <MessageCircle className="h-4 w-4" />;
    default:        return <FileText className="h-4 w-4" />;
  }
}

export interface LeadActivityTimelineProps {
  activities: any[];
  isLoading: boolean;
  isAr: boolean;
  t: TFunc;
}

export function LeadActivityTimeline({
  activities, isLoading, isAr, t,
}: LeadActivityTimelineProps) {
  const getActivityLabel = (type: string) => t(`leads.activity.${type}`) || type;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.activity_history")}</CardTitle>
        <CardDescription>{t("leads.all_interactions")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            {t("leads.no_activities")}
          </div>
        ) : (
          <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
            {activities.map((activity: any) => (
              <div key={activity.id} className="relative pl-6">
                <span className="absolute -left-3.5 top-1 bg-background border border-muted p-1 rounded-full text-muted-foreground">
                  {getActivityIcon(activity.type)}
                </span>
                <div className="bg-muted/30 border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{getActivityLabel(activity.type)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("leads.by")} {activity.userName}
                      </span>
                      {activity.duration && (
                        <Badge variant="outline" className="text-xs py-0">{activity.duration}m</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: isAr ? arDateLocale : undefined,
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{activity.notes}</p>
                  {(activity.outcome || activity.nextAction) && (
                    <div className="mt-3 text-xs bg-background p-2 rounded border space-y-1">
                      {activity.outcome && (
                        <div>
                          <span className="font-semibold text-muted-foreground">
                            {t("leads.outcome_label")}
                          </span>{" "}
                          {activity.outcome}
                        </div>
                      )}
                      {activity.nextAction && (
                        <div>
                          <span className="font-semibold text-muted-foreground">
                            {t("leads.next_short")}
                          </span>{" "}
                          {activity.nextAction}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
