import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundles the Express API into a single self-contained ESM file that the
 * Vercel Node runtime invokes as a serverless function handler.
 *
 * Key differences from build.mjs (the long-running-server build):
 * - Entry point is `vercel-handler.ts`, which exports the Express app as the
 *   default export instead of calling `app.listen`.
 * - Output goes to `dist-vercel/` so it never collides with the local build.
 *
 * Everything is bundled into one file (workspace packages, drizzle, pg, etc.)
 * so the thin `api/[[...path]].mjs` re-export traces cleanly with no extra
 * runtime dependencies. Only truly native / optional modules are externalized.
 */
async function buildServerless() {
  const distDir = path.resolve(artifactDir, "../../api");
  // Clean up bundled artifacts but preserve index.js (the function wrapper)
  const builtFiles = await import("node:fs").then(fs => fs.promises.readdir(distDir, { withFileTypes: true }));
  for (const file of builtFiles) {
    if (file.name !== "index.js") {
      await rm(path.join(distDir, file.name), { recursive: true, force: true });
    }
  }

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Native / optional modules that cannot (or should not) be bundled.
    // `pg` lazily requires `pg-native` inside a try/catch and falls back to the
    // pure-JS driver, so externalizing it is safe.
    external: [
      "*.node",
      "sharp",
      "pg-native",
      "pg-cloudflare",
      "better-sqlite3",
      "sqlite3",
      "bcrypt",
      "argon2",
      "cpu-features",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on worker threads for its (dev-only) pretty transport;
      // the plugin emits the transport sidecars so they resolve at runtime.
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    // Ensure CJS-only packages (express, etc.) keep working in the ESM output.
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
}

buildServerless().catch((err) => {
  console.error(err);
  process.exit(1);
});
