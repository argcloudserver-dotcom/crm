import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";

/* ────────────────────────────────────────────────────────────────────────────
 * Module mocks — isolate RegisterPage from network, animation, routing, theming.
 * ──────────────────────────────────────────────────────────────────────────── */

// Controls the verify mutation outcome per-test.
const verifyState = vi.hoisted(() => ({
  isPending: false,
  // "success" | { message }
  outcome: "success" as "success" | { message: string },
}));

// Controls apiFetch responses per-test (queue of resolvers).
const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/api-client", () => ({
  useRegister: () => ({ mutate: vi.fn(), isPending: false }),
  useListTeamLeaders: () => ({ data: [] }),
  useVerifyEmail: () => ({
    isPending: verifyState.isPending,
    mutate: (
      _vars: unknown,
      opts: { onSuccess: () => void; onError: (e: unknown) => void },
    ) => {
      if (verifyState.outcome === "success") opts.onSuccess();
      else opts.onError({ message: verifyState.outcome.message });
    },
  }),
  apiFetch: apiFetchMock,
}));

vi.mock("@/shared/hooks/useCsrfToken", () => ({ useCsrfToken: () => "test-csrf" }));

vi.mock("@/shared/hooks/useAuthPalette", () => ({
  useAuthPalette: () => ({
    heading: "#000", body: "#333", muted: "#999", emailHighlight: "#c8a84b",
    inputBg: "#fff", inputBorder: "#ccc", inputText: "#000",
    backLink: "#555", selectBorder: "#ccc", selectText: "#000",
  }),
}));

vi.mock("@/shared/components/layout/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ({ children, ...props }: any) => {
          // Strip framer-only props that React would warn about.
          const { whileHover, whileTap, initial, animate, transition, exit, ...rest } = props;
          void whileHover; void whileTap; void initial; void animate; void transition; void exit;
          const Tag = tag as any;
          return <Tag {...rest}>{children}</Tag>;
        },
    },
  ),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

import { useResendCountdown, VerifyStage, PendingStage } from "../pages/RegisterPage";

beforeEach(() => {
  verifyState.isPending = false;
  verifyState.outcome = "success";
  apiFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function typeCodeAndSubmit(code = "123456") {
  const input = screen.getByLabelText(/^verification code$/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: code } });
  fireEvent.submit(input.closest("form")!);
}

/* ──────────────────────────── countdown ──────────────────────────── */
describe("useResendCountdown", () => {
  it("starts at 60s and resets to 60 each time start() is called", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResendCountdown());
    expect(result.current.seconds).toBe(60);

    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.seconds).toBe(57);

    // Restart resets back to 60.
    act(() => result.current.start());
    expect(result.current.seconds).toBe(60);
  });

  it("counts down to 0 and enables resend", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResendCountdown());
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.seconds).toBe(0);
    expect(result.current.canResend).toBe(true);
  });
});

/* ──────────────────────────── invalid / expired ──────────────────────────── */
describe("VerifyStage error messages", () => {
  it("shows an invalid-code message and remaining attempts", async () => {
    verifyState.outcome = { message: "That verification code is invalid." };
    render(<VerifyStage registeredEmail="u@x.com" onBack={() => {}} onVerified={() => {}} />);
    typeCodeAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/invalid/i);
    expect(alert.textContent).toMatch(/4 attempts remaining/i);
  });

  it("shows an expired-code message", async () => {
    verifyState.outcome = { message: "Your verification code has expired. Please request a new code." };
    render(<VerifyStage registeredEmail="u@x.com" onBack={() => {}} onVerified={() => {}} />);
    typeCodeAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/expired/i);
  });

  it("locks verification after repeated failures", async () => {
    verifyState.outcome = { message: "Invalid code." };
    render(<VerifyStage registeredEmail="u@x.com" onBack={() => {}} onVerified={() => {}} />);
    // Submit sequentially, waiting for each failure to register before the next
    // (react-hook-form's handleSubmit resolves asynchronously).
    for (let i = 1; i <= 5; i++) {
      typeCodeAndSubmit();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          i >= 5 ? "Too many failed attempts" : `${5 - i} attempt`,
        ),
      );
    }
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/too many failed attempts/i);
    // Verify button becomes disabled (locked).
    const btn = screen.getByRole("button", { name: /locked/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

/* ──────────────────────────── successful routing ──────────────────────────── */
describe("VerifyStage success", () => {
  it("calls onVerified after a successful verification", async () => {
    verifyState.outcome = "success";
    const onVerified = vi.fn();
    render(<VerifyStage registeredEmail="u@x.com" onBack={() => {}} onVerified={onVerified} />);
    typeCodeAndSubmit();
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
  });

  it("exposes an accessible status region", () => {
    render(<VerifyStage registeredEmail="u@x.com" onBack={() => {}} onVerified={() => {}} />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

/* ──────────────────────────── approval polling ──────────────────────────── */
describe("PendingStage approval polling", () => {
  it("switches to approved once status becomes active", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: "active" } }),
    });
    render(<PendingStage registeredEmail="u@x.com" />);
    expect(await screen.findByText(/you're approved/i)).toBeTruthy();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
  });

  it("stays pending while status is not active", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: "pending" } }),
    });
    render(<PendingStage registeredEmail="u@x.com" />);
    expect(screen.getByText(/pending administrator approval/i)).toBeTruthy();
  });
});
