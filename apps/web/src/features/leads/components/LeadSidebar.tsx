import { format } from "date-fns";
import { Edit } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { cn } from "@/shared/utils/utils";
import { DeadlineBadge } from "./DeadlineBadge";
import type { TFunc } from "@workspace/core";

export interface LeadSidebarProps {
  lead: any;
  users: any[];
  isAr: boolean;
  t: TFunc;
  onEdit: () => void;
  onAssign: (userId: string) => void;
  canManage?: boolean;
}

export function LeadSidebar({ lead, users, isAr, t, onEdit, onAssign, canManage = true }: LeadSidebarProps) {
  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("leads.deadline")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                {t("leads.deadline_label")}
              </p>
              {lead.deadline ? (
                <DeadlineBadge deadline={lead.deadline} isAr={isAr} t={t} />
              ) : (
                <span className="text-sm text-muted-foreground italic">{t("leads.no_deadline")}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                {t("leads.next_action_date")}
              </p>
              {lead.nextActionAt ? (
                <span className="text-sm">{format(new Date(lead.nextActionAt), "MMM d, yyyy")}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">{t("leads.not_scheduled")}</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
              <Edit className={cn("h-3.5 w-3.5", isAr ? "ml-2" : "mr-2")} />{" "}
              {t("leads.edit_details")}
            </Button>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("leads.salesperson")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar
                name={(lead as any).primarySalesName || t("leads.unassigned")}
                className="h-10 w-10"
              />
              <div>
                <p className="text-sm font-medium">
                  {(lead as any).primarySalesName || t("leads.unassigned")}
                </p>
                <p className="text-xs text-muted-foreground">{t("leads.primary_agent")}</p>
              </div>
            </div>
            <Select onValueChange={onAssign} value={(lead as any).primarySalesId || undefined}>
              <SelectTrigger>
                <SelectValue placeholder={t("leads.reassign_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {lead.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("leads.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
