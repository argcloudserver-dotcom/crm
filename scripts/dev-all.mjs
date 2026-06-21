#!/usr/bin/env node
/**
 * AUDIT FIX (v11): One-shot dev orchestrator.
 *
 *   pnpm dev:all
 *
 * Brings the local Postgres up (via docker-compose), installs deps if
 * node_modules is missing, then starts the API and the web app in parallel
 * with live, color-tagged log lines. Ctrl-C cleanly tears both down.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (res.status !== 0) {
    console.error(`\n[dev:all] command failed: ${cmd} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}

function tryRun(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  return res.status === 0;
}

// 1. Start the database container in the background.
console.log("[dev:all] starting docker postgres ...");
const ok = tryRun("docker", ["compose", "up", "-d", "db"]);
if (!ok) {
  // Fallback for older docker installs.
  if (!tryRun("docker-compose", ["up", "-d", "db"])) {
    console.error(
      "[dev:all] could not start the db container. Install Docker (or run " +
        "your own Postgres at postgres://app:app@localhost:5432/realestate) " +
        "and retry.",
    );
    process.exit(1);
  }
}

// 1b. AUDIT FIX (v12): Wait for Postgres to accept TCP connections before
// starting api/web. Retries every 1s up to 60s.
import { createConnection } from "node:net";
async function waitForPort(host, port, timeoutMs = 60_000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    const reachable = await new Promise((resolve) => {
      const s = createConnection({ host, port });
      const done = (v) => {
        s.destroy();
        resolve(v);
      };
      s.once("connect", () => done(true));
      s.once("error", () => done(false));
      setTimeout(() => done(false), 1500);
    });
    if (reachable) {
      console.log(`[dev:all] postgres is ready (after ${attempt} attempt${attempt > 1 ? "s" : ""})`);
      return true;
    }
    if (attempt === 1 || attempt % 5 === 0) {
      console.log(`[dev:all] waiting for postgres on ${host}:${port} (attempt ${attempt}) ...`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
const dbReady = await waitForPort("127.0.0.1", 5432);
if (!dbReady) {
  console.error("[dev:all] postgres did not become ready within 60s. Check `docker compose logs db`.");
  process.exit(1);
}

// 2. Install workspace dependencies if needed.
if (!existsSync(resolve(root, "node_modules"))) {
  console.log("[dev:all] installing dependencies (pnpm install) ...");
  run("pnpm", ["install"]);
} else {
  console.log("[dev:all] node_modules present, skipping install");
}

// 3. Start API and web in parallel, tagging each line.
const tasks = [
  { name: "api", color: "\x1b[36m", filter: "@workspace/api" },
  { name: "web", color: "\x1b[35m", filter: "@workspace/web" },
];

const children = [];

function tag(name, color, line) {
  process.stdout.write(`${color}[${name}]\x1b[0m ${line}`);
}

for (const t of tasks) {
  const child = spawn("pnpm", ["--filter", t.filter, "dev"], {
    cwd: root,
    env: process.env,
  });
  children.push(child);

  let buf = "";
  const onData = (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf("\n")) !== -1) {
      tag(t.name, t.color, buf.slice(0, i + 1));
      buf = buf.slice(i + 1);
    }
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("exit", (code) => {
    tag(t.name, t.color, `exited with code ${code}\n`);
    for (const c of children) if (c !== child) c.kill("SIGINT");
    process.exit(code ?? 0);
  });
}

function shutdown() {
  for (const c of children) c.kill("SIGINT");
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
