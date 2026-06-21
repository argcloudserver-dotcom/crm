import { z } from "zod";

/**
 * AUDIT FIX (v10): Centralised, actionable environment validation.
 *
 * - Every var has a short purpose comment so failure output is self-explanatory.
 * - `AUTH_MODE` toggles between real Google/Facebook OAuth ("real") and a
 *   local mock flow ("mock") that needs no provider secrets. Defaults to
 *   "mock" in development and "real" in production.
 * - In production, the script will hard-fail if PUBLIC_APP_URL is missing
 *   or if AUTH_MODE=real but the matching provider secrets are not set.
 */

const AuthMode = z.enum(["mock", "real"]);

const EnvSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().url(),

  // Tokens / cookies (must be long random strings)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be >=32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be >=32 chars"),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be >=32 chars"),
  SESSION_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),

  // CORS — comma-separated list, transformed into a string[]
  CORS_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  COOKIE_DOMAIN: z.string().optional(),

  // Auth diagnostics logging (#4). When unset, logging is on in production and
  // off in development so local consoles stay clean. Accepts true/false/1/0.
  AUTH_LOG_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true" || v === "1")),



  // Public-facing URLs
  PUBLIC_APP_URL: z.string().url(),

  // Auth mode + OAuth providers
  AUTH_MODE: AuthMode.optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),

  // Supabase (only required if frontend uses it server-side)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

type ParsedEnv = z.infer<typeof EnvSchema> & { AUTH_MODE: "mock" | "real" };

/** Pretty-prints a list of fatal env problems and exits the process. */
function abort(problems: string[]): never {
  const banner = "═".repeat(72);
  // eslint-disable-next-line no-console
  console.error(
    "\n" + banner +
    "\n  ❌  Environment configuration is invalid — the API cannot start." +
    "\n" + banner + "\n",
  );
  for (const p of problems) {
    // eslint-disable-next-line no-console
    console.error("  • " + p);
  }
  // eslint-disable-next-line no-console
  console.error(
    "\n  Fix the issues above in apps/api/.env (see apps/api/.env.example)" +
    "\n  and restart. To run without external OAuth/Supabase secrets in dev," +
    "\n  set AUTH_MODE=mock.\n" + banner + "\n",
  );
  process.exit(1);
}

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const problems: string[] = [];
  for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
    for (const msg of errs ?? []) problems.push(`${field}: ${msg}`);
  }
  abort(problems);
}

const data = parsed.data as ParsedEnv;

// Default AUTH_MODE based on NODE_ENV so dev "just works".
if (!data.AUTH_MODE) {
  data.AUTH_MODE = data.NODE_ENV === "production" ? "real" : "mock";
}

// Cross-field validation (after defaults are filled in).
const xProblems: string[] = [];

if (data.AUTH_MODE === "real") {
  const googleSet = data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET;
  const facebookSet = data.FACEBOOK_CLIENT_ID && data.FACEBOOK_CLIENT_SECRET;
  if (!googleSet && !facebookSet) {
    xProblems.push(
      "AUTH_MODE=real but no OAuth provider is fully configured. " +
      "Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET and/or " +
      "FACEBOOK_CLIENT_ID + FACEBOOK_CLIENT_SECRET, or use AUTH_MODE=mock for local dev.",
    );
  }
}

if (data.NODE_ENV === "production") {
  if (data.AUTH_MODE === "mock") {
    xProblems.push(
      "AUTH_MODE=mock is FORBIDDEN in production. " +
      "Configure real OAuth credentials and set AUTH_MODE=real (or unset it).",
    );
  }
  if (data.PUBLIC_APP_URL.startsWith("http://")) {
    xProblems.push("PUBLIC_APP_URL must be https:// in production.");
  }
}

if (xProblems.length) abort(xProblems);

// Friendly startup banner (single line) so the dev mode is obvious.
// eslint-disable-next-line no-console
console.log(
  `[env] NODE_ENV=${data.NODE_ENV} AUTH_MODE=${data.AUTH_MODE} ` +
  `PUBLIC_APP_URL=${data.PUBLIC_APP_URL}`,
);

export const env = data;
export type Env = z.infer<typeof EnvSchema>;
