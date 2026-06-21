import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Timer } from "lucide-react";
import {
  useListLeadActivities, useListLeads, useListProjects, useListUsers,
} from "@workspace/api-client";
import { useI18n } from "@/shared/contexts/i18nContext";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/utils";

import { LeadHeader } from "../components/LeadHeader";
import { LeadActivityTimeline } from "../components/LeadActivityTimeline";
import { LogActivityForm } from "../components/LogActivityForm";
import { LeadSidebar } from "../components/LeadSidebar";
import { EditLeadDialog } from "../modals/EditLeadDialog";
import { ConvertToDealDialog } from "../modals/ConvertToDealDialog";
import { DeleteLeadDialog } from "../modals/DeleteLeadDialog";
import { useLeadDetailMutations } from "@workspace/api-client/hooks/leads";
import type { ConvertDealFormValues } from "@workspace/api-client/zod/leads";
import { toast } from "sonner";

export function LeadDetailPage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false);
  const [wonInitialValues, setWonInitialValues] = useState<Partial<ConvertDealFormValues>>({});

  const { data: leads = [], isLoading: isLeadsLoading } = useListLeads({ search: undefined });
  const lead = useMemo(() => leads.find((l: any) => l.id === id), [leads, id]);
  const { data: activities = [], isLoading: isActivitiesLoading } = useListLeadActivities(id as string);
  const { data: users = [] } = useListUsers();
  const { data: projects = [] } = useListProjects();

  const m = useLeadDetailMutations({
    leadId: id,
    lead,
    t,
    toast: {
      success: (msg: string) => toast.success(msg),
      error: (msg: string) => toast.error(msg),
    },
    navigate: { push: (href: string) => setLocation(href) },
    onEditSuccess: () => setIsEditOpen(false),
    onWonSuccess: () => setIsWonDialogOpen(false),
  });

  const handleStatusChange = (status: string) => {
    if (status === "won") {
      setWonInitialValues({
        dealValue: (lead as any)?.dealValue ?? "",
        projectId: (lead as any)?.projectId ?? undefined,
        assignedSalesId: (lead as any)?.primarySalesId ?? undefined,
      });
      setIsWonDialogOpen(true);
      return;
    }
    m.updateLeadStatus(status);
  };

  if (isLeadsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">{t("leads.not_found")}</h2>
        <p className="text-muted-foreground mt-2">{t("leads.not_found_desc")}</p>
        <Button className="mt-4" onClick={() => setLocation("/leads")}>
          <ArrowLeft className={cn("h-4 w-4", isAr ? "ml-2 rotate-180" : "mr-2")} />
          {t("leads.back_to_leads")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeadHeader
        lead={lead}
        isAr={isAr}
        t={t}
        onBack={() => setLocation("/leads")}
        onStatusChange={handleStatusChange}
        onEdit={() => setIsEditOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {lead.nextAction && (
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <Timer className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                  {t("leads.next_action_label")}
                </p>
                <p className="text-sm">{lead.nextAction}</p>
                {lead.nextActionAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("leads.scheduled")} {format(new Date(lead.nextActionAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          )}

          <LeadActivityTimeline
            activities={activities}
            isLoading={isActivitiesLoading}
            isAr={isAr}
            t={t}
          />

          <LogActivityForm
            isSaving={m.isCreatingActivity}
            t={t}
            onSubmit={(values, reset) => m.addActivity(values, reset)}
          />
        </div>

        <LeadSidebar
          lead={lead}
          users={users as any[]}
          isAr={isAr}
          t={t}
          onEdit={() => setIsEditOpen(true)}
          onAssign={m.assign}
        />
      </div>

      <EditLeadDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        lead={lead}
        isSaving={m.isUpdatingLead}
        t={t}
        onSubmit={m.editLead}
      />

      <ConvertToDealDialog
        open={isWonDialogOpen}
        onOpenChange={setIsWonDialogOpen}
        initialValues={wonInitialValues}
        projects={projects as any[]}
        users={users as any[]}
        isAr={isAr}
        isPending={m.isUpdatingStatus || m.isCreatingClient}
        t={t}
        onSubmit={m.convertToDeal}
      />

      <DeleteLeadDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        t={t}
        onConfirm={m.removeLead}
      />
    </div>
  );
}

