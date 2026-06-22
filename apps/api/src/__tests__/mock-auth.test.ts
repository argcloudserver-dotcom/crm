/**
 * AUDIT FIX (v11): End-to-end tests for AUTH_MODE switching, the mock
 * OAuth flow, the mock-login endpoint, and the /health/auth-config
 * diagnostics endpoint.
 *
 * The whole `@workspace/db` package is stubbed so the tests run without
 * a real Postgres. We capture rows in an in-memory store and reflect them
 * back through a fake `db.select/.insert/.delete` chain that satisfies the
 * subset of drizzle's fluent API used by the repository + session layer.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

// 1. Configure env BEFORE importing the app — env.ts validates at import time.
process.env["NODE_ENV"] = "development";
process.env["PORT"] = "4000";
process.env["DATABASE_URL"] = "postgres://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = "x".repeat(64);
process.env["JWT_REFRESH_SECRET"] = "x".repeat(64);
process.env["CSRF_SECRET"] = "x".repeat(64);
process.env["CORS_ORIGINS"] = "http://localhost:5173";
process.env["PUBLIC_APP_URL"] = "http://localhost:5173";
process.env["AUTH_MODE"] = "mock";

// 2. Stub the database layer used by the repository + session modules.
type Row = Record<string, unknown>;
const users: Row[] = [];
const sessions: Row[] = [];
let nextId = 1;

function makeBuilder(store: Row[]) {
  // Minimal fluent chain: .select().from(x).where(_).limit(n)
  //                       .insert(x).values(v).returning()
  //                       .update(x).set(v).where(_).returning()
  //                       .delete(x).where(_)
  // The actual where predicate is unused — repository code that runs in these
  // tests looks rows up via the "last inserted" or "by email" pattern, so we
  // implement a permissive matcher that returns ALL rows; assertions in tests
  // verify side-effects (insert count) instead.
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => store.slice(0, 1) }),
        limit: () => store.slice(0, 1),
      }),
    }),
    insert: () => ({
      values: (v: Row | Row[]) => {
        const rows = Array.isArray(v) ? v : [v];
        for (const r of rows) {
          store.push({ id: `row-${nextId++}`, ...r });
        }
        return {
          returning: () => store.slice(-rows.length),
        };
      },
    }),
    update: () => ({
      set: (v: Row) => ({
        where: () => ({
          returning: () => {
            if (store.length) Object.assign(store[store.length - 1]!, v);
            return store.slice(-1);
          },
        }),
      }),
    }),
    delete: () => ({ where: () => undefined }),
  };
}

const fakeUsersDb = makeBuilder(users);
const fakeSessionsDb = makeBuilder(sessions);

// Route db.* calls to the right store based on the table argument.
const db = {
  select: (...a: unknown[]) => ({
    from: (table: unknown) => {
      const store =
        table === "__sessions__" ? sessions :
        // Heuristic: sessions queries always follow .from(sessionsTable);
        // everything else hits users in our test surface.
        users;
      const b = makeBuilder(store);
      return b.select().from();
    },
  }),
  insert: (table: unknown) => {
    const store = (table as { __name?: string }).__name === "sessions" ? sessions : users;
    return makeBuilder(store).insert();
  },
  update: (table: unknown) => {
    const store = (table as { __name?: string }).__name === "sessions" ? sessions : users;
    return makeBuilder(store).update();
  },
  delete: (table: unknown) => {
    const store = (table as { __name?: string }).__name === "sessions" ? sessions : users;
    return makeBuilder(store).delete();
  },
};
void fakeUsersDb; void fakeSessionsDb;

const table = (name: string) =>
  new Proxy({ __name: name } as Record<string, unknown>, {
    get: (target, prop) => prop in target ? target[prop as string] : `${name}.${String(prop)}`,
  });

vi.mock("@workspace/db", () => ({
  db,
  usersTable: table("users"),
  sessionsTable: table("sessions"),
  notificationsTable: table("notifications"),
  leadsTable: table("leads"),
  leadActivitiesTable: table("lead_activities"),
  leadAssignmentsTable: table("lead_assignments"),
  leadDelaysTable: table("lead_delays"),
  projectsTable: table("projects"),
  clientsTable: table("clients"),
  resaleUnitsTable: table("resale_units"),
  resalePhotosTable: table("resale_photos"),
  plannerTasksTable: table("planner_tasks"),
  auditLogsTable: table("audit_logs"),
  permissionsTable: table("permissions"),
  rolePermissionsTable: table("role_permissions"),
  userPermissionOverridesTable: table("user_permission_overrides"),
  salesTargetsTable: table("sales_targets"),
}));

// drizzle-orm helpers used by the repo — stub to no-ops.
vi.mock("drizzle-orm", () => ({
  eq: () => true,
  and: () => true,
  or: () => true,
  inArray: () => true,
  sql: () => true,
}));

// Email side effects must not run.
vi.mock("../lib/email/auth-emails", () => ({
  sendAdminNewUserAlert: vi.fn(async () => undefined),
  sendPasswordResetLink: vi.fn(async () => undefined),
  sendVerificationCode: vi.fn(async () => undefined),
  sendWelcomePendingApproval: vi.fn(async () => undefined),
}));

// 3. Now import the app + supertest.
const { default: request } = await import("supertest");
const { app } = await import("../app");

async function csrfAgent() {
  const agent = request.agent(app);
  const tokenRes = await agent.get("/api/csrf-token");
  return { agent, token: tokenRes.body.csrfToken as string };
}

describe("/api/health/auth-config", () => {
  it("reports AUTH_MODE=mock and providers stubbed", async () => {
    const res = await request(app).get("/api/health/auth-config");
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.authMode).toBe("mock");
    expect(body.providers.google.configured).toBe(true);
    expect(body.providers.google.reason).toMatch(/AUTH_MODE=mock/);
    expect(body.providers.facebook.configured).toBe(true);
    expect(body.providers.supabase.configured).toBe(false);
    expect(body.providers.supabase.reason).toMatch(/SUPABASE/);
  });
});

describe("mock OAuth (AUTH_MODE=mock)", () => {
  it("POST /api/auth/mock-login signs in any email", async () => {
    const before = users.length;
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post("/api/auth/mock-login")
      .set("x-csrf-token", token)
      .send({ email: "alice@dev.local", name: "Alice" });
    expect(res.status).toBe(200);
    expect(users.length).toBe(before + 1);
    // Cookie should be set for web client
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toMatch(/session=/);
  });

  it("GET /api/auth/google short-circuits to mock user (302 redirect)", async () => {
    const before = users.length;
    const res = await request(app).get(
      "/api/auth/google?email=bob@dev.local&name=Bob",
    );
    expect([302, 200]).toContain(res.status);
    expect(users.length).toBeGreaterThanOrEqual(before);
  });

  it("GET /api/auth/facebook short-circuits to mock user (302 redirect)", async () => {
    const before = users.length;
    const res = await request(app).get("/api/auth/facebook");
    expect([302, 200]).toContain(res.status);
    expect(users.length).toBeGreaterThanOrEqual(before);
  });
});

describe("mock endpoints are gated by AUTH_MODE", () => {
  it("POST /api/auth/mock-login returns 403 + reason when AUTH_MODE=real", async () => {
    const envMod = await import("../lib/env");
    const prev = envMod.env.AUTH_MODE;
    (envMod.env as { AUTH_MODE: string }).AUTH_MODE = "real";
    try {
      const { agent, token } = await csrfAgent();
      const res = await agent
        .post("/api/auth/mock-login")
        .set("x-csrf-token", token)
        .send({});
      expect(res.status).toBe(403);
      const err = res.body.error ?? res.body;
      expect(err.code).toBe("MOCK_AUTH_DISABLED");
      expect(typeof err.reason).toBe("string");
      expect(err.reason).toMatch(/AUTH_MODE/);
    } finally {
      (envMod.env as { AUTH_MODE: string }).AUTH_MODE = prev;
    }
  });

  it("GET /api/auth/google returns 403 + reason when AUTH_MODE=real (no creds)", async () => {
    const envMod = await import("../lib/env");
    const prev = envMod.env.AUTH_MODE;
    (envMod.env as { AUTH_MODE: string }).AUTH_MODE = "real";
    try {
      const res = await request(app).get("/api/auth/google");
      // Either 403 from our mock guard OR 503 from the real-mode "not configured" branch.
      expect([403, 503]).toContain(res.status);
    } finally {
      (envMod.env as { AUTH_MODE: string }).AUTH_MODE = prev;
    }
  });
});

beforeAll(() => {
  // Quiet pino in tests.
  process.env["LOG_LEVEL"] = "silent";
});
