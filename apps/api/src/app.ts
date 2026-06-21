import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf";
import { env } from "./lib/env";
// AUDIT FIX: imported from non-existent "./routes". The API router is built by
// `buildApiRouter` in "./features".
import { buildApiRouter } from "./features";
import { errorHandler, notFoundHandler } from "./shared/utils/errorHandler";

export const app = express();

// Behind a proxy/load balancer: required for secure cookies + accurate IPs for rate limit
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    // AUDIT FIX (v13): Tight CSP in production; disabled in dev for HMR.
    contentSecurityPolicy:
      env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              fontSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", ...env.CORS_ORIGINS],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser(env.CSRF_SECRET));

// ---- Rate limiting ----
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ---- CSRF (cookie + header double-submit) ----
const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName:
    env.NODE_ENV === "production" ? "__Host-psifi.x-csrf-token" : "x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    path: "/",
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string | undefined,
});

app.get("/api/csrf-token", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});

/*
 * FIX: CSRF bypass protection
 * Mobile clients use Bearer token WITHOUT an auth cookie.
 * Web clients always have the auth cookie, so they MUST pass CSRF validation.
 * Checking both conditions prevents a browser from spoofing a mobile client
 * by simply adding an Authorization header.
 */
app.use((req, res, next) => {
  // Heartbeat is a low-risk endpoint; exempt from CSRF
  if (req.path === "/api/heartbeat") return next();

  const hasCookie = !!(
    req.cookies?.["session"] || req.cookies?.["__Host-session"]
  );
  const hasBearer = req.headers.authorization?.startsWith("Bearer ");

  // Mobile client: Bearer token present AND no session cookie
  if (hasBearer && !hasCookie) return next();

  // Safe methods don't need CSRF protection
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // All other requests (especially web clients) must pass CSRF
  return doubleCsrfProtection(req, res, next);
});

app.use("/api", buildApiRouter());

// AUDIT FIX (v8): every upload landed in apps/api/public/uploads and the API
// returned `/uploads/<file>.webp` as the URL, but nothing served that path —
// so every uploaded image (avatars, project covers, resale photos) 404'd in
// the browser. Serve the directory statically.
const uploadsDir = path.join(process.cwd(), "public", "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    fallthrough: false,
    maxAge: "30d",
    setHeaders: (res) => {
      // Allow cross-origin <img> embedding (helmet default is "same-site").
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// 404 for unmatched routes, then centralized error handler.
app.use(notFoundHandler);
app.use(errorHandler);

// AUDIT FIX: index.ts imports the app as a default export, but app.ts only
// exposed a named export, so the server entrypoint failed to start.
export default app;
