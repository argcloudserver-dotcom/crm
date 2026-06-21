import { format } from "date-fns";
import {
  ArrowLeft, ChevronDown, CheckCircle, Edit, Mail, MoreVertical, Phone, Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { SourceBadge } from "@/shared/components/SourceBadge";
import { cn } from "@/shared/utils/utils";
import { DeadlineBadge } from "./DeadlineBadge";
import { STATUS_LABELS, type TFunc } from "@workspace/core";

export interface LeadHeaderProps {
  lead: any;
  isAr: boolean;
  t: TFunc;
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function LeadHeader({
  lead, isAr, t, onBack, onStatusChange, onEdit, onDelete,
}: LeadHeaderProps) {
  return (
    <>
      <Button
        variant="ghost" size="sm" onClick={onBack}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className={cn("h-4 w-4", isAr ? "ml-2 rotate-180" : "mr-2")} />
        {t("leads.back")}
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{lead.name}</h1>
            <StatusBadge status={lead.status} />
            <SourceBadge source={lead.source} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Phone className="h-3.5 w-3.5" /> <span dir="ltr">{lead.phone}</span>
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Mail className="h-3.5 w-3.5" /> {lead.email}
              </a>
            )}
            {(lead as any).projectName && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{t("leads.project_label")}</span>{" "}
                {(lead as any).projectName}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{t("leads.created_label")}</span>
              {format(new Date(lead.createdAt), "MMM d, yyyy")}
            </div>
          </div>
          {lead.deadline && (
            <div className="mt-3">
              <DeadlineBadge deadline={lead.deadline} isAr={isAr} t={t} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none">
                {t("leads.change_status")}{" "}
                <ChevronDown className={cn("h-4 w-4", isAr ? "mr-2" : "ml-2")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("leads.update_status")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(STATUS_LABELS).map(([key, lbl]) => (
                <DropdownMenuItem key={key} onClick={() => onStatusChange(key)}>
                  {key === lead.status ? (
                    <CheckCircle className={cn("h-4 w-4 text-emerald-500", isAr ? "ml-2" : "mr-2")} />
                  ) : (
                    <span className="w-6" />
                  )}
                  {isAr ? lbl.ar : lbl.en}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("leads.actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />{" "}
                {t("leads.edit_details")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 cursor-pointer"
                onClick={onDelete}
              >
                <Trash2 className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />{" "}
                {t("leads.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
