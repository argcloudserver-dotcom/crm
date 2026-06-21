/**
 * React Query hooks for the Resale feature.
 *
 * Re-exports the generated low-level hooks under a stable feature-scoped
 * path so web and mobile resale screens import from the same module.
 * Also re-exports the platform-agnostic adapter helpers (`useResaleActions`,
 * raw fetchers) from the local `./api` and `./useResaleActions` modules.
 */
export {
  useListResaleUnits,
  useGetResaleUnit,
  useCreateResaleUnit,
  useUpdateResaleUnit,
  useDeleteResaleUnit,
  getListResaleUnitsQueryKey,
  getGetResaleUnitQueryKey,
  getListResaleUnitsQueryOptions,
  getGetResaleUnitQueryOptions,
  listResaleUnits,
  getResaleUnit,
  createResaleUnit,
  updateResaleUnit,
  deleteResaleUnit,
} from "../../generated/api";

export type {
  ListResaleUnitsQueryResult,
  GetResaleUnitQueryResult,
  CreateResaleUnitMutationResult,
  CreateResaleUnitMutationBody,
  UpdateResaleUnitMutationResult,
  UpdateResaleUnitMutationBody,
  DeleteResaleUnitMutationResult,
} from "../../generated/api";

export type { ListResaleUnitsParams } from "../../generated/api.schemas";

export {
  uploadResalePhotoFile,
  attachResalePhoto,
  deleteResalePhoto,
  patchResaleUnit,
} from "./api";

export { useResaleActions } from "./useResaleActions";
export type {
  UseResaleActionsParams,
  UseResaleActionsResult,
} from "./useResaleActions";
