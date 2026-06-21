import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-client/zod";
import { ok } from "../../shared/utils/response";
import { env } from "../../lib/env";
import { openApiSpec } from "./openapi";

const router: IRouter = Router();

// AUDIT FIX (v12): Serve OpenAPI spec + Swagger UI viewer.
router.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});
router.get("/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  window.ui = SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger-ui" });
</script>
</body></html>`);
});

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  ok(res, data);
});

/**
 * AUDIT FIX (v11): Configuration diagnostics endpoint.
 *
 * Reports whether each OAuth provider and the Supabase connection are
 * correctly configured for the current AUTH_MODE. Exposes ONLY
 * presence/derived metadata — never the secret values themselves.
 *
 * GET /api/health/auth-config
 */
type ProviderStatus = {
  configured: boolean;
  reason?: string;
  callbackURL?: string;
};

router.get("/health/auth-config", (_req, res) => {
  const baseUrl = env.PUBLIC_APP_URL.replace(/\/$/, "");

  function check(
    providerName: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    callbackPath: string,
  ): ProviderStatus {
    if (env.AUTH_MODE === "mock") {
      return {
        configured: true,
        reason:
          "AUTH_MODE=mock — provider stubbed locally (no real credentials required)",
        callbackURL: `${baseUrl}${callbackPath}`,
      };
    }
    if (!clientId && !clientSecret) {
      return {
        configured: false,
        reason: `${providerName.toUpperCase()}_CLIENT_ID and ${providerName.toUpperCase()}_CLIENT_SECRET are not set`,
      };
    }
    if (!clientId) {
      return {
        configured: false,
        reason: `${providerName.toUpperCase()}_CLIENT_ID is not set`,
      };
    }
    if (!clientSecret) {
      return {
        configured: false,
        reason: `${providerName.toUpperCase()}_CLIENT_SECRET is not set`,
      };
    }
    return { configured: true, callbackURL: `${baseUrl}${callbackPath}` };
  }

  const supabase: ProviderStatus = (() => {
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      return { configured: true };
    }
    if (!env.SUPABASE_URL && !env.SUPABASE_ANON_KEY) {
      return {
        configured: false,
        reason: "SUPABASE_URL and SUPABASE_ANON_KEY are not set",
      };
    }
    return {
      configured: false,
      reason: !env.SUPABASE_URL
        ? "SUPABASE_URL is not set"
        : "SUPABASE_ANON_KEY is not set",
    };
  })();

  ok(res, {
    nodeEnv: env.NODE_ENV,
    authMode: env.AUTH_MODE,
    publicAppUrl: env.PUBLIC_APP_URL,
    providers: {
      google: check(
        "google",
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        "/api/auth/google/callback",
      ),
      facebook: check(
        "facebook",
        env.FACEBOOK_CLIENT_ID,
        env.FACEBOOK_CLIENT_SECRET,
        "/api/auth/facebook/callback",
      ),
      supabase,
    },
  });
});

export default router;
