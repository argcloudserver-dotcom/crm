/**
 * React Query hooks for the Employees (Users) feature.
 */
export {
  useListUsers,
  useListPendingUsers,
  useGetUser,
  useUpdateUser,
  useDeleteUser,
  useApproveUser,
  useRejectUser,
  getListUsersQueryKey,
  getListPendingUsersQueryKey,
  getGetUserQueryKey,
  getListUsersQueryOptions,
  getListPendingUsersQueryOptions,
  getGetUserQueryOptions,
  listUsers,
  listPendingUsers,
  getUser,
  updateUser,
  deleteUser,
  approveUser,
  rejectUser,
} from "../../generated/api";

export type {
  ListUsersQueryResult,
  ListUsersQueryError,
  ListPendingUsersQueryResult,
  ListPendingUsersQueryError,
  GetUserQueryResult,
  GetUserQueryError,
  UpdateUserMutationResult,
  UpdateUserMutationBody,
  UpdateUserMutationError,
  ApproveUserMutationResult,
  ApproveUserMutationError,
  RejectUserMutationResult,
  RejectUserMutationError,
} from "../../generated/api";

export type { ListUsersParams } from "../../generated/api.schemas";
