import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  useRegister,
  useVerifyEmail,
  useListTeamLeaders,
  apiFetch,
} from "@workspace/api-client";
import { useCsrfToken } from "@/shared/hooks/useCsrfToken";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { AuthShell } from "@/shared/components/layout/AuthShell";
import { useAuthPalette } from "@/shared/hooks/useAuthPalette";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const RESEND_COOLDOWN = 60;
const ease = [0.22, 1, 0.36, 1] as const;

export function useResendCountdown() {
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useCallback(() => {
    setSeconds(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  return { seconds, start, canResend: seconds === 0 };
}

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(5, { message: "Phone number is required" }),
    // Match server-side rules: min 12 chars, upper + lower + digit.
    password: z
      .string()
      .min(12, { message: "Password must be at least 12 characters" })
      .max(128, { message: "Password too long" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one digit" }),
    confirmPassword: z.string(),
    role: z.enum(["admin", "director", "team_leader", "sales"]),
    teamLeaderId: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });


const verifySchema = z.object({
  code: z.string().length(6, { message: "Code must be 6 digits" }).regex(/^\d+$/, { message: "Code must be numeric" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type VerifyFormValues = z.infer<typeof verifySchema>;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  director: "Director",
  team_leader: "Team Leader",
  sales: "Sales Agent",
};

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ fontSize: "11px", color: "#F87171", marginTop: "5px" }}>{msg}</p>;
}

/* ── Verify stage ── */
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

// Visually-hidden style for screen-reader-only status announcements.
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function VerifyStage({ registeredEmail, onBack, onVerified }: { registeredEmail: string; onBack: () => void; onVerified: () => void }) {
  const p = useAuthPalette();
  const verifyEmail = useVerifyEmail();
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockRemaining, setLockRemaining] = useState(0);
  // Screen-reader live announcements (resend loading + verification results).
  const [statusMsg, setStatusMsg] = useState("");
  const { seconds, start: startCountdown, canResend } = useResendCountdown();

  const remainingAttempts = Math.max(0, MAX_VERIFY_ATTEMPTS - attempts);
  const isLocked = lockRemaining > 0;

  // Kick off the resend cooldown as soon as the verify screen appears.
  useEffect(() => {
    startCountdown();
  }, [startCountdown]);

  // Lockout countdown after repeated failures.
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const id = setInterval(() => {
      setLockRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [lockRemaining]);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const onVerify = (data: VerifyFormValues) => {
    if (isLocked) return;
    setError(null);
    setStatusMsg("Verifying your code…");
    verifyEmail.mutate(
      { data: { email: registeredEmail, code: data.code } },
      {
        onSuccess: () => {
          setStatusMsg("Email verified. Redirecting to approval status.");
          onVerified();
        },
        onError: (err) => {
          const baseMsg = (err as any)?.message || "That verification code is invalid or has expired.";
          const nextAttempts = attempts + 1;
          setAttempts(nextAttempts);
          const left = Math.max(0, MAX_VERIFY_ATTEMPTS - nextAttempts);
          if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
            setLockRemaining(LOCKOUT_SECONDS);
            const lockMsg = `${baseMsg} Too many failed attempts — verification is paused for ${LOCKOUT_SECONDS} seconds.`;
            setError(lockMsg);
            setStatusMsg(lockMsg);
          } else {
            const withCount = `${baseMsg} ${left} attempt${left === 1 ? "" : "s"} remaining.`;
            setError(withCount);
            setStatusMsg(withCount);
          }
        },
      }
    );
  };


  async function handleResend() {
    setResendMsg(null); setError(null); setIsResending(true);
    setStatusMsg("Sending a new verification code…");
    try {
      const res = await apiFetch("/api/auth/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as any;
        // Surface the server cooldown message (e.g. rate limit) when present.
        throw new Error(body?.error?.message ?? body?.error ?? "Failed to resend");
      }
      setResendMsg("A new code has been sent to your email.");
      setStatusMsg("A new verification code has been sent to your email.");
      // A fresh code resets the failed-attempt lockout.
      setAttempts(0);
      setLockRemaining(0);
      startCountdown();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resend code";
      setError(msg);
      setStatusMsg(msg);
    } finally { setIsResending(false); }
  }

  const verifyDisabled = verifyEmail.isPending || isLocked;

  return (
    <AuthShell maxWidth={420}>
      {/* Screen-reader live region: announces loading + results politely. */}
      <div aria-live="polite" role="status" style={srOnly}>
        {statusMsg}
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
        style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}
      >
        <div style={{ width: 24, height: "1px", background: "#c8a84b" }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#c8a84b", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Email verification
        </span>
      </motion.div>
      <h2 style={{ fontSize: "26px", fontWeight: 800, color: p.heading, letterSpacing: "-0.03em", marginBottom: "8px", transition: "color 0.3s" }}>
        Check your inbox
      </h2>
      <p style={{ fontSize: "14px", color: p.body, lineHeight: 1.7, marginBottom: "32px", transition: "color 0.3s" }}>
        We sent a 6-digit code to{" "}
        <span style={{ color: p.emailHighlight, fontWeight: 500 }}>{registeredEmail}</span>.
        It expires in 15 minutes.
      </p>

      <form onSubmit={form.handleSubmit(onVerify)}>
        {error && (
          <div role="alert" style={{ marginBottom: "16px", padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "8px", fontSize: "13px", color: "#F87171" }}>
            {error}
          </div>
        )}
        {resendMsg && (
          <div style={{ marginBottom: "16px", padding: "10px 14px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", fontSize: "13px", color: "#4ADE80" }}>
            {resendMsg}
          </div>
        )}

        <div style={{ marginBottom: "32px" }}>
          <label htmlFor="verify-code" style={{ display: "block", fontSize: "10px", fontWeight: 600, color: focused ? "#c8a84b" : p.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px", transition: "color 0.2s" }}>
            Verification code
          </label>
          <input
            id="verify-code"
            inputMode="numeric" maxLength={6} placeholder="0 0 0 0 0 0"
            aria-invalid={!!error}
            disabled={isLocked}
            {...form.register("code")}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: p.inputBg,
              border: `1px solid ${focused ? "#c8a84b" : p.inputBorder}`,
              borderRadius: "8px", padding: "16px",
              color: p.inputText, fontSize: "28px", fontWeight: 700,
              letterSpacing: "0.4em", textAlign: "center",
              outline: "none", transition: "border-color 0.2s, color 0.3s",
              fontFamily: "ui-monospace, monospace",
              opacity: isLocked ? 0.5 : 1,
            }}
          />
          <ErrorMsg msg={form.formState.errors.code?.message} />
          {!error && attempts > 0 && !isLocked && (
            <p style={{ fontSize: "11px", color: p.muted, marginTop: "6px" }}>
              {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining.
            </p>
          )}
          {isLocked && (
            <p style={{ fontSize: "11px", color: "#F87171", marginTop: "6px" }}>
              Verification paused. Try again in{" "}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{lockRemaining}s</span> or request a new code.
            </p>
          )}
        </div>

        <motion.button
          type="submit" disabled={verifyDisabled}
          whileHover={{ scale: verifyDisabled ? 1 : 1.015, backgroundColor: "rgba(200,168,75,0.08)" }}
          whileTap={{ scale: verifyDisabled ? 1 : 0.98 }}
          transition={{ duration: 0.15 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent",
            border: "1px solid #c8a84b", borderRadius: "4px", padding: "13px 20px",
            color: verifyDisabled ? "rgba(200,168,75,0.5)" : "#c8a84b",
            fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: verifyDisabled ? "not-allowed" : "pointer", marginBottom: "20px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {verifyEmail.isPending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {isLocked ? `Locked (${lockRemaining}s)` : "Verify email"}
          </span>
          <ArrowRight style={{ width: 15, height: 15 }} />
        </motion.button>
      </form>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", color: p.backLink, padding: 0, transition: "color 0.3s" }}>
          Back to registration
        </button>
        {canResend || error || isLocked ? (
          <button type="button" onClick={handleResend} disabled={isResending} aria-label="Resend verification code" style={{ background: "none", border: "none", cursor: isResending ? "not-allowed" : "pointer", fontSize: "12.5px", color: isResending ? p.muted : "#c8a84b", display: "flex", alignItems: "center", gap: "5px", padding: 0 }}>
            {isResending && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
            {isResending ? "Sending…" : (error || isLocked) ? "Request a new code" : "Resend code"}
          </button>
        ) : (
          <span style={{ fontSize: "12px", color: p.muted, transition: "color 0.3s" }}>
            Resend in <span style={{ color: p.emailHighlight, fontVariantNumeric: "tabular-nums" }}>{seconds}s</span>
          </span>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  );
}

/* ── Pending stage ── */
export function PendingStage({ registeredEmail }: { registeredEmail: string }) {
  const p = useAuthPalette();
  const [approved, setApproved] = useState(false);

  // Poll the public approval-status endpoint so the page reacts the moment an
  // admin approves the account — no manual refresh required.
  //
  // The first check fires immediately, then subsequent checks use exponential
  // backoff (5s → 10s → 20s … capped at 60s) to reduce load. Polling stops
  // immediately once approval is detected so we never fire a duplicate request
  // or a redundant state update.
  useEffect(() => {
    if (!registeredEmail || approved) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let delay = 5000;
    const MAX_DELAY = 60000;

    const check = async () => {
      try {
        const res = await apiFetch(
          `/api/auth/approval-status?email=${encodeURIComponent(registeredEmail)}`,
        );
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as { data?: { status?: string } };
          if (body?.data?.status === "active") {
            setApproved(true); // effect re-runs; cleanup stops the loop
            return;
          }
        }
      } catch {
        /* transient network errors are ignored; we keep polling */
      }
      if (cancelled) return;
      timeoutId = setTimeout(check, delay);
      delay = Math.min(delay * 2, MAX_DELAY);
    };

    void check();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [registeredEmail, approved]);



  return (
    <AuthShell maxWidth={400}>
      <div style={{ textAlign: "center" }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
          style={{ width: 56, height: 56, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}
        >
          <CheckCircle2 style={{ width: 24, height: 24, color: "#4ADE80" }} />
        </motion.div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: p.heading, marginBottom: "12px", transition: "color 0.3s" }}>
          {approved ? "You're approved!" : "Email verified!"}
        </h2>
        <p style={{ fontSize: "14px", color: p.body, lineHeight: 1.7, marginBottom: "32px", transition: "color 0.3s" }}>
          {approved
            ? "An administrator has approved your account. You can now sign in."
            : "Your account is now pending administrator approval. This page will update automatically once you're approved."}
        </p>
        {!approved && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "28px", fontSize: "12px", color: p.muted }}>
            <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
            Waiting for approval…
          </div>
        )}
        <Link
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            border: `1px solid ${approved ? "#c8a84b" : "rgba(200,168,75,0.3)"}`, borderRadius: "4px",
            padding: "11px 20px", color: "#c8a84b", textDecoration: "none",
            fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
          }}
        >
          {approved ? "Sign in now" : "Return to sign in"} <ArrowRight style={{ width: 14, height: 14 }} />
        </Link>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  );
}

/* ── Main register page ── */
export function RegisterPage() {
  const p = useAuthPalette();
  const csrfToken = useCsrfToken();
  const register = useRegister({ request: csrfToken ? { headers: { "x-csrf-token": csrfToken } } : undefined });
  const { data: teamLeaders = [] } = useListTeamLeaders();

  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"register" | "verify" | "pending">("register");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", role: "sales", teamLeaderId: "" },
  });


  const watchRole = form.watch("role");

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    if (!csrfToken) {
      setError("Security initialization failed. Please refresh the page.");
      return;
    }
    const teamLeaderId =
      data.role === "sales" && data.teamLeaderId && data.teamLeaderId.length > 0
        ? data.teamLeaderId
        : null;
    register.mutate(
      { data: { name: data.name, email: data.email, phone: data.phone, password: data.password, role: data.role, teamLeaderId } },

      {
        onSuccess: () => { setRegisteredEmail(data.email); setStage("verify"); },
        onError: (err) => setError((err as any)?.message || "Registration failed. Please try again."),
      }
    );
  };

  if (stage === "verify") return <VerifyStage registeredEmail={registeredEmail} onBack={() => { setStage("register"); setError(null); }} onVerified={() => setStage("pending")} />;
  if (stage === "pending") return <PendingStage registeredEmail={registeredEmail} />;

  const f = (name: string) => focused === name;
  const err = (name: keyof RegisterFormValues) => !!form.formState.errors[name];

  function fieldInput(isFocused: boolean, hasError: boolean): React.CSSProperties {
    return {
      width: "100%", boxSizing: "border-box" as const,
      background: "transparent", border: "none",
      borderBottom: `1px solid ${isFocused ? "#c8a84b" : hasError ? "#F87171" : p.inputBorder}`,
      padding: "10px 0", color: p.inputText, fontSize: "15px",
      outline: "none", transition: "border-color 0.2s, color 0.3s",
    };
  }

  function fieldLabel(isFocused: boolean): React.CSSProperties {
    return {
      display: "block", fontSize: "10px", fontWeight: 600 as const,
      color: isFocused ? "#c8a84b" : p.muted,
      textTransform: "uppercase" as const, letterSpacing: "0.1em",
      marginBottom: "10px", transition: "color 0.2s",
    };
  }

  return (
    <AuthShell maxWidth={480}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
        style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}
      >
        <div style={{ width: 24, height: "1px", background: "#c8a84b" }} />
        <span style={{ fontSize: "10px", fontWeight: 600, color: "#c8a84b", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Request access
        </span>
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease }}
        style={{ fontSize: "28px", fontWeight: 800, color: p.heading, letterSpacing: "-0.03em", marginBottom: "6px", transition: "color 0.3s" }}
      >
        Create account
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.12, ease }}
        style={{ fontSize: "14px", color: p.body, lineHeight: 1.7, marginBottom: "32px", transition: "color 0.3s" }}
      >
        Enter your details below to request platform access.
      </motion.p>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {error && (
          <div style={{ marginBottom: "20px", padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "8px", fontSize: "13px", color: "#F87171" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <div style={{ marginBottom: "24px" }}>
            <label style={fieldLabel(f("name"))}>Full name</label>
            <input placeholder="John Doe" {...form.register("name")} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} style={fieldInput(f("name"), err("name"))} />
            <ErrorMsg msg={form.formState.errors.name?.message} />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={fieldLabel(f("phone"))}>Phone</label>
            <input placeholder="+20 10 1234 5678" {...form.register("phone")} onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} style={fieldInput(f("phone"), err("phone"))} />
            <ErrorMsg msg={form.formState.errors.phone?.message} />
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={fieldLabel(f("email"))}>Email address</label>
          <input type="email" placeholder="name@example.com" {...form.register("email")} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} style={fieldInput(f("email"), err("email"))} />
          <ErrorMsg msg={form.formState.errors.email?.message} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={fieldLabel(false)}>Role</label>
          <Select value={form.watch("role")} onValueChange={(val) => form.setValue("role", val as RegisterFormValues["role"], { shouldValidate: true })}>
            <SelectTrigger style={{ background: "transparent", border: "none", borderBottom: `1px solid ${p.selectBorder}`, borderRadius: 0, padding: "10px 0", color: p.selectText, fontSize: "15px", outline: "none", boxShadow: "none", transition: "color 0.3s, border-color 0.3s" }}>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {watchRole === "sales" && (
          <div style={{ marginBottom: "24px" }}>
            <label style={fieldLabel(false)}>Team Leader (optional)</label>
            <Select
              value={form.watch("teamLeaderId") ? form.watch("teamLeaderId")! : "__none__"}
              onValueChange={(val) =>
                form.setValue("teamLeaderId", val === "__none__" ? undefined : val, { shouldValidate: true })
              }
            >
              <SelectTrigger style={{ background: "transparent", border: "none", borderBottom: `1px solid ${p.selectBorder}`, borderRadius: 0, padding: "10px 0", color: p.selectText, fontSize: "15px", outline: "none", boxShadow: "none", transition: "color 0.3s, border-color 0.3s" }}>
                <SelectValue placeholder="Select your team leader" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None — assign later</SelectItem>
                {teamLeaders.map((tl) => (
                  <SelectItem key={tl.id} value={tl.id}>{tl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamLeaders.length === 0 && (
              <p style={{ fontSize: "11px", color: p.muted, marginTop: "6px" }}>
                No team leaders available yet — an admin can assign one when approving your account.
              </p>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <label style={fieldLabel(f("password"))}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} {...form.register("password")} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} style={{ ...fieldInput(f("password"), err("password")), paddingRight: "32px" }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: p.eyeIcon, padding: 0, transition: "color 0.3s" }}>
                {showPwd ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
            <ErrorMsg msg={form.formState.errors.password?.message} />
          </div>
          <div style={{ marginBottom: "32px" }}>
            <label style={fieldLabel(f("confirm"))}>Confirm</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} {...form.register("confirmPassword")} onFocus={() => setFocused("confirm")} onBlur={() => setFocused(null)} style={{ ...fieldInput(f("confirm"), err("confirmPassword")), paddingRight: "32px" }} />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: p.eyeIcon, padding: 0, transition: "color 0.3s" }}>
                {showConfirm ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
            <ErrorMsg msg={form.formState.errors.confirmPassword?.message} />
          </div>
        </div>

        <motion.button
          type="submit" disabled={register.isPending || !csrfToken}
          whileHover={{ scale: (register.isPending || !csrfToken) ? 1 : 1.015, backgroundColor: "rgba(200,168,75,0.08)" }}
          whileTap={{ scale: (register.isPending || !csrfToken) ? 1 : 0.98 }}
          transition={{ duration: 0.15 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent",
            border: "1px solid #c8a84b", borderRadius: "4px", padding: "13px 20px",
            color: (register.isPending || !csrfToken) ? "rgba(200,168,75,0.5)" : "#c8a84b",
            fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: (register.isPending || !csrfToken) ? "not-allowed" : "pointer", marginBottom: "20px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {(register.isPending || !csrfToken) && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {!csrfToken ? "Initializing..." : "Request account"}
          </span>
          <ArrowRight style={{ width: 15, height: 15 }} />
        </motion.button>
      </form>

      {/* OAuth */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <a href={`${BASE_URL}/api/auth/google`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: "transparent", border: `1px solid ${p.oauthBorder}`, borderRadius: "4px", padding: "10px", fontSize: "13px", color: p.oauthText, textDecoration: "none", transition: "border-color 0.3s, color 0.3s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </a>
        <a href={`${BASE_URL}/api/auth/facebook`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: "transparent", border: `1px solid ${p.oauthBorder}`, borderRadius: "4px", padding: "10px", fontSize: "13px", color: p.oauthText, textDecoration: "none", transition: "border-color 0.3s, color 0.3s" }}>
          <svg width="14" height="14" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </a>
      </div>

      <p style={{ fontSize: "12.5px", color: p.backLink, transition: "color 0.3s" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#c8a84b", textDecoration: "none", fontWeight: 500 }}>
          Sign in
        </Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  );
}
