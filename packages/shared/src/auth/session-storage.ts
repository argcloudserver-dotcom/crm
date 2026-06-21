/**
 * Pluggable session token storage.
 *
 * Web supplies a localStorage-backed adapter; mobile supplies one wired to
 * AsyncStorage. Both implement the same async interface so the shared
 * AuthProvider can be platform-agnostic.
 */
export interface SessionStorageAdapter {
  getToken(): Promise<string | null>;
  setToken(token: string | null): Promise<void>;
  clear(): Promise<void>;
}

export const memorySessionStorage = (): SessionStorageAdapter => {
  let value: string | null = null;
  return {
    async getToken() {
      return value;
    },
    async setToken(token) {
      value = token;
    },
    async clear() {
      value = null;
    },
  };
};
