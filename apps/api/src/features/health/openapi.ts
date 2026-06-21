/**
 * AUDIT FIX (v12): OpenAPI 3.0 spec for the auth-config diagnostics endpoint
 * and the mock/real OAuth auth routes. Served at GET /api/openapi.json with
 * a Swagger-UI viewer at GET /api/docs.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Workspace API — Auth & Health",
    version: "1.0.0",
    description:
      "Authentication and health-check endpoints. The `mock` endpoints are " +
      "only enabled when `AUTH_MODE=mock`; calling them while `AUTH_MODE=real` " +
      "returns HTTP 403 with a `reason` field.",
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    { name: "health", description: "Diagnostics" },
    { name: "auth", description: "Authentication" },
    { name: "mock-auth", description: "Dev-only mock authentication" },
  ],
  paths: {
    "/api/healthz": {
      get: {
        tags: ["health"],
        summary: "Basic liveness probe",
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/health/auth-config": {
      get: {
        tags: ["health"],
        summary: "Report OAuth provider + Supabase configuration status",
        description:
          "Reports whether each provider is correctly configured for the " +
          "current AUTH_MODE. Never exposes secret values.",
        responses: {
          "200": {
            description: "Configuration status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthConfigResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/google": {
      get: {
        tags: ["auth"],
        summary: "Start Google OAuth flow (or mock sign-in when AUTH_MODE=mock)",
        parameters: [
          { name: "email", in: "query", schema: { type: "string" }, description: "Mock-only override" },
          { name: "name", in: "query", schema: { type: "string" }, description: "Mock-only override" },
        ],
        responses: {
          "302": { description: "Redirect to provider or back to app" },
          "503": { description: "Google OAuth not configured (real mode)" },
        },
      },
    },
    "/api/auth/google/callback": {
      get: {
        tags: ["auth"],
        summary: "Google OAuth callback",
        responses: { "302": { description: "Redirect back to app" } },
      },
    },
    "/api/auth/facebook": {
      get: {
        tags: ["auth"],
        summary: "Start Facebook OAuth flow (or mock sign-in when AUTH_MODE=mock)",
        responses: {
          "302": { description: "Redirect to provider or back to app" },
          "503": { description: "Facebook OAuth not configured (real mode)" },
        },
      },
    },
    "/api/auth/facebook/callback": {
      get: {
        tags: ["auth"],
        summary: "Facebook OAuth callback",
        responses: { "302": { description: "Redirect back to app" } },
      },
    },
    "/api/auth/mock-login": {
      post: {
        tags: ["mock-auth"],
        summary: "Sign in as an arbitrary mock user (AUTH_MODE=mock only)",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  name: { type: "string" },
                  client: { type: "string", enum: ["web", "mobile"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Signed in",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { type: "object" },
                    token: { type: "string", description: "Mobile clients only" },
                  },
                },
              },
            },
          },
          "403": {
            description: "Disabled because AUTH_MODE=real",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MockDisabledError" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ProviderStatus: {
        type: "object",
        required: ["configured"],
        properties: {
          configured: { type: "boolean" },
          reason: { type: "string" },
          callbackURL: { type: "string" },
        },
      },
      AuthConfigResponse: {
        type: "object",
        required: ["nodeEnv", "authMode", "publicAppUrl", "providers"],
        properties: {
          nodeEnv: { type: "string" },
          authMode: { type: "string", enum: ["mock", "real"] },
          publicAppUrl: { type: "string" },
          providers: {
            type: "object",
            properties: {
              google: { $ref: "#/components/schemas/ProviderStatus" },
              facebook: { $ref: "#/components/schemas/ProviderStatus" },
              supabase: { $ref: "#/components/schemas/ProviderStatus" },
            },
          },
        },
      },
      MockDisabledError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "MOCK_AUTH_DISABLED" },
              message: { type: "string" },
              reason: {
                type: "string",
                example: "Mock authentication is disabled when AUTH_MODE=real",
              },
            },
          },
        },
      },
    },
  },
} as const;
