/**
 * React Query hooks for the Clients feature.
 *
 * Re-exports the generated low-level hooks under a stable feature-scoped
 * path so web and mobile clients screens import from the same module.
 */
export {
  useListClients,
  useGetClient,
  useCreateClient,
  useUpdateClient,
  getListClientsQueryKey,
  getGetClientQueryKey,
  getListClientsQueryOptions,
  getGetClientQueryOptions,
  listClients,
  getClient,
  createClient,
  updateClient,
} from "../../generated/api";

export type {
  ListClientsQueryResult,
  ListClientsQueryError,
  GetClientQueryResult,
  GetClientQueryError,
  CreateClientMutationResult,
  CreateClientMutationBody,
  CreateClientMutationError,
  UpdateClientMutationResult,
  UpdateClientMutationBody,
  UpdateClientMutationError,
} from "../../generated/api";

export type { ListClientsParams } from "../../generated/api.schemas";
