/**
 * Domain primitives for the Employees feature.
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  title?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}
