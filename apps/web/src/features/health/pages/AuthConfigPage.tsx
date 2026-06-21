/**
 * AUDIT FIX (v12): Web UI for GET /api/health/auth-config.
 *
 * Renders the diagnostics endpoint payload as a status board: each provider
 * (Google, Facebook, Supabase) is shown with a green/red pill and the
 * underlying reason string when something is missing. Refreshable.
 */
import { useEffect, useState, useCallback } from "react";

type ProviderStatus = {
  configured: boolean;
  reason?: string;
  callbackURL?: string;
};

type AuthConfigResponse = {
  nodeEnv: string;
  authMode: "mock" | "real";
  publicAppUrl: string;
  providers: {
    google: ProviderStatus;
    facebook: ProviderStatus;
    supabase: ProviderStatus;
  };
};

const API_BASE =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ||
  "";

function Pill({ ok, label }: { ok: boolean; label: string }) {
  const cls = ok
    ? "bg-green-100 text-green-800 border-green-300"
    : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      {label}
    </span>
  );
}

function ProviderCard({ name, status }: { name: string; status: ProviderStatus }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold capitalize">{name}</h3>
        <Pill ok={status.configured} label={status.configured ? "Configured" : "Missing"} />
      </div>
      {status.reason && (
        <p className="mt-2 text-sm text-muted-foreground">{status.reason}</p>
      )}
      {status.callbackURL && (
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          callback: {status.callbackURL}
        </p>
      )}
    </div>
  );
}

export function AuthConfigPage() {
  const [data, setData] = useState<AuthConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/health/auth-config`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setData(body.data ?? body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auth Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Live status of OAuth providers and Supabase connection
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Failed to load: {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Environment</div>
              <div className="font-mono text-sm">{data.nodeEnv}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Auth Mode</div>
              <div>
                <Pill ok={data.authMode === "mock" || data.authMode === "real"} label={data.authMode} />
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Public App URL</div>
              <div className="break-all font-mono text-xs">{data.publicAppUrl}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProviderCard name="google" status={data.providers.google} />
            <ProviderCard name="facebook" status={data.providers.facebook} />
            <div className="sm:col-span-2">
              <ProviderCard name="supabase" status={data.providers.supabase} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AuthConfigPage;
