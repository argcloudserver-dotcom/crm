import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@workspace/api-client";

interface PermissionsContextType {
  permissions: Record<string, boolean>;
  can: (key: string) => boolean;
  isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: {},
  can: () => false,
  isLoading: true,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["permissions", "me"],
    queryFn: async () => {
      const res = await apiFetch("/api/permissions/me");
      if (res.status === 401 || res.status === 403) {
        return { permissions: {}, role: null };
      }
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const payload = (await res.json()) as {
        data?: { permissions?: Record<string, boolean>; role?: string | null };
        permissions?: Record<string, boolean>;
        role?: string | null;
      };
      return {
        permissions: payload.data?.permissions ?? payload.permissions ?? {},
        role: payload.data?.role ?? payload.role ?? null,
      };
    },
    enabled: !!currentUser && currentUser.status === "active" && currentUser.profileCompleted !== false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const permissions = data?.permissions ?? {};

  const can = (key: string): boolean => {
    if (!currentUser) return false;
    // No role bypass - admin/ceo still respect explicit deny overrides.
    return permissions[key] ?? false;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, can, isLoading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

