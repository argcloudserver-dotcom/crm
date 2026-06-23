import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@workspace/api-client";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Role = "ceo" | "admin" | "team_leader" | "sales";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  ceo: "CEO",
  team_leader: "Team Leader",
  sales: "Sales Agent",
};

interface TeamLeader {
  id: string;
  name: string;
}

/**
 * Shown to any signed-in user whose `profileCompleted` flag is false —
 * typically after they sign in with Google / Facebook for the first time.
 * They must pick a role (and a team leader if they chose Sales) before
 * they can reach the main app.
 */
export function CompleteProfilePage() {
  const { currentUser, refetch } = useAuth();
  const [, setLocation] = useLocation();

  const [role, setRole] = useState<Role | "">("");
  const [teamLeaderId, setTeamLeaderId] = useState<string>("");
  const [phone, setPhone] = useState<string>(currentUser?.phone ?? "");
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "sales") return;
    apiFetch<{ data: TeamLeader[] }>("/api/auth/team-leaders", { method: "GET" })
      .then((res) => {
        // apiFetch returns parsed JSON; the API wraps payloads in { data }.
        const list = (res as { data?: TeamLeader[] })?.data ?? [];
        setTeamLeaders(Array.isArray(list) ? list : []);
      })
      .catch(() => setTeamLeaders([]));
  }, [role]);

  // If the user is not signed in or already completed their profile, bounce.
  useEffect(() => {
    if (!currentUser) {
      setLocation("/login");
      return;
    }
    if (currentUser.profileCompleted === true) {
      // Already done — go home (or pending screen if not yet approved).
      if (currentUser.status === "pending") {
        setLocation("/pending-approval");
      } else {
        setLocation("/home");
      }
    }
  }, [currentUser, setLocation]);

  const canSubmit = useMemo(() => {
    if (!role) return false;
    return true;
  }, [role]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        role,
        teamLeaderId: role === "sales" && teamLeaderId ? teamLeaderId : null,
        phone: phone || null,
      };
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload?.error?.message ?? "Could not save profile");
      }
      await refetch();
      // After completing, OAuth users still need admin approval.
      setLocation("/pending-approval");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
        color: "#e5e7eb",
        padding: "24px",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "rgba(17,24,39,0.85)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "6px" }}>
          Complete your profile
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
          Hi {currentUser?.name ?? "there"} — pick the role you registered for.
          An admin will review and approve your account.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#F87171",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            Role
          </label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e5e7eb",
              }}
            >
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {role === "sales" && teamLeaders.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              Team Leader (optional)
            </label>
            <Select
              value={teamLeaderId}
              onValueChange={(v) => setTeamLeaderId(v)}
            >
              <SelectTrigger
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e5e7eb",
                }}
              >
                <SelectValue placeholder="Select a team leader" />
              </SelectTrigger>
              <SelectContent>
                {teamLeaders.map((tl) => (
                  <SelectItem key={tl.id} value={tl.id}>
                    {tl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "#94a3b8",
              marginBottom: "8px",
            }}
          >
            Phone (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 10 1234 5678"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e5e7eb",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: !canSubmit || submitting ? "#1f2937" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: !canSubmit || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default CompleteProfilePage;
