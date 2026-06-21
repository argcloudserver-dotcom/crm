/**
 * Composite mutation hook for the Lead detail screen.
 *
 * Wraps the generated React Query mutations with optimistic invalidation,
 * shared toast helpers, and post-action navigation. Both navigation and
 * toasts are injected via adapters so the hook stays platform-agnostic —
 * web supplies `wouter` + `sonner`; mobile supplies expo-router + a native
 * snackbar.
 */
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateLead,
  useUpdateLeadStatus,
  useAssignLead,
  useDeleteLead,
  useCreateLeadActivity,
  useCreateClient,
  getListLeadActivitiesQueryKey,
  getListLeadsQueryKey,
  getGetLeadsKanbanQueryKey,
  getListClientsQueryKey,
} from "../../generated/api";
import type {
  ActivityFormValues,
  ConvertDealFormValues,
  EditLeadFormValues,
} from "../../zod/leads";
import type { TFunc } from "@workspace/core";

/** Minimal toast surface; both `sonner.toast` and RN snackbars satisfy this. */
export interface ToastAdapter {
  success: (message: string) => void;
  error: (message: string) => void;
}

/** Minimal navigation surface; web (wouter) and mobile (expo-router) wrap this. */
export interface NavigateAdapter {
  push: (href: string) => void;
}

export interface UseLeadDetailMutationsParams {
  leadId: string | undefined;
  lead: unknown;
  t: TFunc;
  toast: ToastAdapter;
  navigate: NavigateAdapter;
  onEditSuccess: () => void;
  onWonSuccess: () => void;
}

export function useLeadDetailMutations({
  leadId,
  lead,
  t,
  toast,
  navigate,
  onEditSuccess,
  onWonSuccess,
}: UseLeadDetailMutationsParams) {
  const queryClient = useQueryClient();

  const updateStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const assignLead = useAssignLead();
  const createActivity = useCreateLeadActivity();
  const deleteLead = useDeleteLead();
  const createClient = useCreateClient();

  const leadRecord = (lead ?? {}) as Record<string, unknown>;

  const addActivity = (values: ActivityFormValues, onDone: () => void) => {
    if (!leadId) return;
    createActivity.mutate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { leadId, data: values as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListLeadActivitiesQueryKey(leadId),
          });
          toast.success(t("leads.activity_logged"));
          onDone();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const editLead = (values: EditLeadFormValues) => {
    if (!leadId) return;
    updateLead.mutate(
      {
        leadId,
        data: {
          name: values.name,
          phone: values.phone || null,
          email: values.email || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          source: values.source as any,
          notes: values.notes || null,
          nextAction: values.nextAction || null,
          deadline: values.deadline || null,
          nextActionAt: values.nextActionAt || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast.success(t("leads.lead_updated"));
          onEditSuccess();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const updateLeadStatusFn = (status: string) => {
    if (!leadId) return;
    updateStatus.mutate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { leadId, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          queryClient.invalidateQueries({
            queryKey: getGetLeadsKanbanQueryKey(),
          });
          toast.success(t("leads.status_updated"));
        },
      },
    );
  };

  const convertToDeal = (
    values: ConvertDealFormValues,
    skipConvert = false,
  ) => {
    if (!leadId || !lead) return;

    const markWon = () => {
      updateStatus.mutate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { leadId, data: { status: "won" as any } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListLeadsQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetLeadsKanbanQueryKey(),
            });
            onWonSuccess();
            if (!skipConvert) {
              toast.success(t("leads.deal_converted"));
              navigate.push("/clients");
            } else {
              toast.success(t("leads.status_updated"));
            }
          },
        },
      );
    };

    if (skipConvert) {
      markWon();
      return;
    }

    const paymentMethod = values.paymentMethod;
    const showInstallments =
      paymentMethod === "installments" || paymentMethod === "mortgage";

    createClient.mutate(
      {
        data: {
          name: (leadRecord.name as string) ?? "",
          phone: (leadRecord.phone as string | undefined) || undefined,
          email: (leadRecord.email as string | undefined) || undefined,
          leadId,
          dealValue: values.dealValue || undefined,
          unitNumber: values.unitNumber || undefined,
          unitType: values.unitType || undefined,
          area: values.area || undefined,
          paymentMethod: values.paymentMethod || undefined,
          downPayment: showInstallments
            ? values.downPayment || undefined
            : undefined,
          contractDate: values.contractDate || undefined,
          numberOfInstallments: showInstallments
            ? values.numberOfInstallments || undefined
            : undefined,
          installmentAmount: showInstallments
            ? values.installmentAmount || undefined
            : undefined,
          projectId: values.projectId || undefined,
          assignedSalesId: values.assignedSalesId || undefined,
          notes: (leadRecord.notes as string | undefined) || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          markWon();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const assign = (userId: string) => {
    if (!leadId) return;
    assignLead.mutate(
      { leadId, data: { salesId: userId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast.success(t("leads.reassigned"));
        },
      },
    );
  };

  const removeLead = () => {
    if (!leadId) return;
    deleteLead.mutate(
      { leadId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast.success(t("leads.lead_deleted"));
          navigate.push("/leads");
        },
      },
    );
  };

  return {
    addActivity,
    editLead,
    updateLeadStatus: updateLeadStatusFn,
    convertToDeal,
    assign,
    removeLead,
    isUpdatingLead: updateLead.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isCreatingActivity: createActivity.isPending,
    isCreatingClient: createClient.isPending,
  };
}
