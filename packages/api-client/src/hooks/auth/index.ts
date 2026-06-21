/**
 * Auth hook re-exports.
 *
 * Centralised entry point so apps can import React Query hooks via
 *   `@workspace/api-client/hooks/auth`
 * instead of reaching into the generated barrel.
 */
export {
  useLogin,
  useLogout,
  useRegister,
  useGetMe,
  useForgotPassword,
  getLoginMutationOptions,
  getLogoutMutationOptions,
  getRegisterMutationOptions,
  getGetMeQueryKey,
  getGetMeQueryOptions,
  login,
  logout,
  register,
  getMe,
  forgotPassword,
} from "../../generated/api";

export type {
  LoginMutationResult,
  LoginMutationBody,
  LoginMutationError,
  GetMeQueryResult,
  GetMeQueryError,
} from "../../generated/api";
