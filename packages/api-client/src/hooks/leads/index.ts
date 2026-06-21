/**
 * React Query hooks for the Leads feature.
 *
 * Re-exports the generated low-level hooks under friendlier names, and
 * provides the shared `useLeadDetailMutations` composite hook that both
 * web and mobile detail screens consume.
 */
export {
  useListLeads as useLeads,
  useGetLead as useLead,
  useCreateLead,
  useUpdateLead,
  useUpdateLeadStatus,
  useAssignLead,
  useDeleteLead,
  useCreateLeadActivity,
  useGetLeadsKanban,
  useListLeadActivities,
  // Query-key + options helpers (used for cache invalidation)
  getListLeadsQueryKey,
  getGetLeadQueryKey,
  getGetLeadsKanbanQueryKey,
  getListLeadActivitiesQueryKey,
  getListLeadsQueryOptions,
  getGetLeadQueryOptions,
  // Raw functions for non-React callers
  listLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  createLeadActivity,
} from "../../generated/api";

export type {
  ListLeadsQueryResult,
  GetLeadQueryResult,
} from "../../generated/api";

export { useLeadDetailMutations } from "./useLeadDetailMutations";
export type { UseLeadDetailMutationsParams } from "./useLeadDetailMutations";
