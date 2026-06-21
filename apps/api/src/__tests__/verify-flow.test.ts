/**
 * Integration tests for the email-verification + approval flow:
 *   - invalid / expired verification code messages
 *   - successful verification response (drives the client's routing to "pending")
 *   - resend-verification rate limiting (anti-spam)
 *   - public approval-status polling endpoint
 *
 * The auth repository and email side-effects are mocked so the routes, service
 * logic, validation, and rate-limit middleware run end-to-end without Postgres.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// env must be configured before importing the app (validated at import time).
process.env["NODE_ENV"] = "development";
process.env["PORT"] = "4000";
process.env["DATABASE_URL"] = "postgres://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = "x".repeat(64);
process.env["JWT_REFRESH_SECRET"] = "x".repeat(64);
process.env["CSRF_SECRET"] = "x".repeat(64);
process.env["CORS_ORIGINS"] = "http://localhost:5173";
process.env["PUBLIC_APP_URL"] = "http://localhost:5173";
process.env["AUTH_MODE"] = "mock";

// Mutable fixture the repository mock reads from, controllable per-test.
const fixture = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
}));

vi.mock("../features/auth/auth.repository", () => ({
  findActiveTeamLeaders: vi.fn(async () => []),
  findByEmail: vi.fn(async () => fixture.user),
  findByResetToken: vi.fn(async () => null),
  insertUser: vi.fn(async (v: Record<string, unknown>) => ({ id: "u1", ...v })),
  updateUser: vi.fn(async (_id: string, v: Record<string, unknown>) => {
    if (fixture.user) Object.assign(fixture.user, v);
    return fixture.user;
  }),
  findActiveAdmins: vi.fn(async () => []),
  insertAdminNotifications: vi.fn(async () => undefined),
}));

// Keep the rest of the app's db imports from touching Postgres. We preserve the
// real table exports (the whole app's routers import them at module load) and
// only replace the live `db` client with an inert stub.
vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const noop = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => undefined }),
  };
  return { ...actual, db: noop };
});

vi.mock("drizzle-orm", () => ({
  eq: () => true, and: () => true, or: () => true, inArray: () => true, sql: () => true,
}));

vi.mock("../lib/email/auth-emails", () => ({
  sendAdminNewUserAlert: vi.fn(async () => undefined),
  sendPasswordResetLink: vi.fn(async () => undefined),
  sendVerificationCode: vi.fn(async () => undefined),
  sendWelcomePendingApproval: vi.fn(async () => undefined),
}));

const { default: request } = await import("supertest");
const { app } = await import("../app");

beforeEach(() => {
  fixture.user = null;
});

describe("POST /api/auth/verify-email", () => {
  it("returns a specific message for an invalid code", async () => {
    fixture.user = {
      id: "u1", email: "a@x.com", name: "A", status: "pending",
      emailVerifiedAt: null, verifyToken: "111111",
      verifyTokenExpires: new Date(Date.now() + 600_000),
    };
    const res = await request(app)
      .post("/api/auth/verify-email").set("Authorization", "Bearer test")
      .send({ email: "a@x.com", code: "222222" });
    expect(res.status).toBe(400);
    expect((res.body.error?.message ?? "")).toMatch(/invalid/i);
  });

  it("returns a specific message for an expired code", async () => {
    fixture.user = {
      id: "u1", email: "a@x.com", name: "A", status: "pending",
      emailVerifiedAt: null, verifyToken: "111111",
      verifyTokenExpires: new Date(Date.now() - 1000),
    };
    const res = await request(app)
      .post("/api/auth/verify-email").set("Authorization", "Bearer test")
      .send({ email: "a@x.com", code: "111111" });
    expect(res.status).toBe(400);
    expect((res.body.error?.message ?? "")).toMatch(/expired/i);
  });

  it("verifies successfully with a correct, unexpired code", async () => {
    fixture.user = {
      id: "u1", email: "a@x.com", name: "A", status: "pending",
      emailVerifiedAt: null, verifyToken: "123456",
      verifyTokenExpires: new Date(Date.now() + 600_000),
    };
    const res = await request(app)
      .post("/api/auth/verify-email").set("Authorization", "Bearer test")
      .send({ email: "a@x.com", code: "123456" });
    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(data.success).toBe(true);
  });
});

describe("GET /api/auth/approval-status (polling)", () => {
  it("reports pending then active for the same account", async () => {
    fixture.user = {
      id: "u1", email: "a@x.com", name: "A", status: "pending",
      emailVerifiedAt: new Date(),
    };
    let res = await request(app).get("/api/auth/approval-status?email=a@x.com");
    expect(res.status).toBe(200);
    expect((res.body.data ?? res.body).status).toBe("pending");

    fixture.user.status = "active";
    res = await request(app).get("/api/auth/approval-status?email=a@x.com");
    expect((res.body.data ?? res.body).status).toBe("active");
  });

  it("returns found:false for an unknown email", async () => {
    fixture.user = null;
    const res = await request(app).get("/api/auth/approval-status?email=none@x.com");
    expect(res.status).toBe(200);
    expect((res.body.data ?? res.body).found).toBe(false);
  });
});

describe("POST /api/auth/resend-verification rate limiting", () => {
  it("allows a few requests then returns 429", async () => {
    fixture.user = {
      id: "u1", email: "limit@x.com", name: "L", status: "pending",
      emailVerifiedAt: null,
    };
    const send = () =>
      request(app)
        .post("/api/auth/resend-verification").set("Authorization", "Bearer test")
        .send({ email: "limit@x.com" });

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line no-await-in-loop
      statuses.push((await send()).status);
    }
    // First 3 succeed (200), the 4th is throttled (429).
    expect(statuses.slice(0, 3).every((s) => s === 200)).toBe(true);
    expect(statuses[3]).toBe(429);
  });
});
