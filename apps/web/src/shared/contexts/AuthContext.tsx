import { createContext, useContext, useEffect, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client";
import type { User } from "@workspace/api-client";
import { useLocation } from "wouter";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // The /api/auth/me probe now returns 200 with a null user when there is no
  // active session (instead of 401), so this query no longer errors or retries
  // noisily on app start. A null `currentUser` simply means "not logged in".
  const { data: currentUser, isLoading, refetch, error } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      staleTime: 30_000,
      retry: false,
    },
  });


  const [location, setLocation] = useLocation();

  // SECURITY FIX: pending / rejected accounts must NEVER land on a
  // protected page. Force-redirect them to the dedicated pending page so
  // even if a session cookie was created the CRM stays out of reach.
  useEffect(() => {
    if (isLoading || !currentUser) return;
    const blocked = currentUser.status === "pending" || currentUser.status === "rejected";
    const onPublic =
      location.startsWith("/pending-approval") ||
      location.startsWith("/login") ||
      location.startsWith("/register") ||
      location.startsWith("/verify-email") ||
      location.startsWith("/forgot-password") ||
      location.startsWith("/reset-password");
    if (blocked && !onPublic) {
      setLocation("/pending-approval");
    }
  }, [currentUser, isLoading, location, setLocation]);

  return (
    <AuthContext.Provider value={{ currentUser: currentUser || null, isLoading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
