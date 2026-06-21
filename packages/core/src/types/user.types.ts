export type UserRole = "admin" | "manager" | "agent";
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
