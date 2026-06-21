export type {
  ListUsersQuery,
  UpdateUserInput,
  RejectUserInput,
} from "./users.schemas";

export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
  avatarUrl: string | null;
}
