import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envModule = resolve(here, "../lib/env.ts");
const tsxBin = resolve(here, "../../node_modules/.bin/tsx");

const VALID = {
  NODE_ENV: "development",
  PORT: "4000",
  DATABASE_URL: "postgres://app:app@localhost:5432/realestate",
  JWT_SECRET: "x".repeat(64),
  JWT_REFRESH_SECRET: "x".repeat(64),
  CSRF_SECRET: "x".repeat(64),
  CORS_ORIGINS: "http://localhost:5173",
  PUBLIC_APP_URL: "http://localhost:5173",
};

function runEnv(extra: Record<string, string | undefined>) {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...VALID, ...extra })) {
    if (v === undefined) continue;
    env[k] = v;
  }
  // PATH must be present for spawn to find node.
  env["PATH"] = process.env["PATH"] ?? "";
  const res = spawnSync(
    tsxBin,
    ["-e", `import('${envModule}').then(m => console.log('AUTH_MODE=' + m.env.AUTH_MODE))`],
    { env, encoding: "utf8" },
  );
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("env validation", () => {
  it("accepts a fully valid dev env and defaults AUTH_MODE=mock", () => {
    const r = runEnv({});
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("AUTH_MODE=mock");
  });

  it("defaults AUTH_MODE=real in production", () => {
    const r = runEnv({
      NODE_ENV: "production",
      PUBLIC_APP_URL: "https://example.com",
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("AUTH_MODE=real");
  });

  it("aborts when PUBLIC_APP_URL is missing", () => {
    const r = runEnv({ PUBLIC_APP_URL: undefined });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/PUBLIC_APP_URL/);
  });

  it("aborts when JWT_SECRET is too short", () => {
    const r = runEnv({ JWT_SECRET: "short" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/JWT_SECRET/);
  });

  it("aborts when AUTH_MODE=real but no provider is configured", () => {
    const r = runEnv({ AUTH_MODE: "real" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/AUTH_MODE=real/);
  });

  it("aborts when AUTH_MODE=mock in production", () => {
    const r = runEnv({
      NODE_ENV: "production",
      AUTH_MODE: "mock",
      PUBLIC_APP_URL: "https://example.com",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/mock.*FORBIDDEN in production/);
  });

  it("aborts when production PUBLIC_APP_URL is http", () => {
    const r = runEnv({
      NODE_ENV: "production",
      PUBLIC_APP_URL: "http://example.com",
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/https/);
  });
});
