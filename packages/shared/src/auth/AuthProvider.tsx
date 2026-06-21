import * as React from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client/hooks/auth";
import {
  setAuthTokenGetter,
  type User,
} from "@workspace/api-client";
import type { SessionStorageAdapter } from "./session-storage";
import { memorySessionStorage } from "./session-storage";

export interface AuthContextValue {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  /** Platform-specific persistence adapter. Defaults to in-memory. */
  storage?: SessionStorageAdapter;
}

export function AuthProvider({
  children,
  storage,
}: AuthProviderProps): React.ReactElement {
  const adapter = React.useMemo(
    () => storage ?? memorySessionStorage(),
    [storage],
  );
  const [token, setTokenState] = React.useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = React.useState(false);

  // Hydrate token from storage on mount, then wire api-client.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await adapter.getToken();
      if (cancelled) return;
      setTokenState(stored);
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  // Keep api-client's token getter in sync.
  React.useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => setAuthTokenGetter(null);
  }, [token]);

  const meQuery = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: bootstrapped && !!token,
    },
  });

  const setToken = React.useCallback(
    async (next: string | null) => {
      await adapter.setToken(next);
      setTokenState(next);
    },
    [adapter],
  );

  const signOut = React.useCallback(async () => {
    await adapter.clear();
    setTokenState(null);
  }, [adapter]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      currentUser: (meQuery.data as User | undefined) ?? null,
      token,
      isLoading: !bootstrapped || (!!token && meQuery.isLoading),
      isAuthenticated: !!token && !!meQuery.data,
      setToken,
      signOut,
      refetch: () => {
        void meQuery.refetch();
      },
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      meQuery.refetch,
      token,
      bootstrapped,
      setToken,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
