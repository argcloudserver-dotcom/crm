export type {
  ValidPermissionRole,
  UpdateRolePermissionInput,
  SetOverrideInput,
} from "./permissions.schemas";

export interface RolePermissionRecord {
  role: string;
  permissionKey: string;
  isEnabled: boolean;
}

export interface UserPermissionOverrideRecord {
  userId: string;
  permissionKey: string;
  override: "allow" | "deny";
  reason?: string | null;
}
