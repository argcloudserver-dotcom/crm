# apps/api/src — Layered Feature Structure

The API was reorganised into feature folders. Each folder owns its own
routes, business logic (service), data access (repository), validation
schemas (Zod), and TypeScript types, plus a barrel `index.ts`.

```
src/
├── app.ts                          # Express bootstrap (middleware + router)
├── index.ts                        # Server entry (process.env.PORT)
├── features/
│   ├── auth/        { routes | service | repository | schemas | types }
│   ├── users/
│   ├── leads/
│   ├── projects/
│   ├── clients/
│   ├── resale/
│   ├── planner/
│   ├── notifications/
│   ├── dashboard/
│   ├── reports/
│   ├── permissions/
│   ├── delays/
│   ├── heartbeat/
│   ├── upload/
│   ├── health/
│   └── index.ts                    # buildApiRouter() — mounts every feature
├── shared/
│   ├── middlewares/  # requireAuth, rateLimit
│   ├── utils/        # response helpers, asyncHandler, validate, getAppUrl, errorHandler, camelToSnake
│   ├── schemas/      # cross-feature Zod helpers
│   └── types/        # global Express request typings
└── lib/
    ├── auth/         # password hashing, session/cookie, passport strategies
    ├── email/        # Resend client + templates + auth/lead emails
    ├── database/     # re-exports @workspace/db (single import point)
    ├── audit.ts      # audit-log writer
    ├── logger.ts     # pino logger
    └── sanitize.ts   # User sanitisation
```

## Layering rules

- **routes** — Express wiring, validation middleware, response shaping.
  Routes only call services; they never touch the database directly.
- **service** — Business logic. Calls repositories and shared libs (email,
  audit, logger). Returns plain data, never `Response` objects.
- **repository** — Drizzle queries against `@workspace/db`. The only layer
  allowed to import `db`.
- **schemas** — Zod schemas + the `z.infer` types reused by services.
- **types** — Non-Zod TypeScript types and re-exports from `@workspace/db`.

## Standardised response shape

Every JSON response goes through helpers in
`shared/utils/response.ts` and follows:

```json
{
  "success": true,
  "data": { ... },         // optional
  "error": { "code": "...", "message": "...", "details": ... }, // when success=false
  "meta": { ... }          // optional
}
```

- `ok(res, data, meta?)` → 200 with `{ success: true, data }`
- `created(res, data, meta?)` → 201
- `noContent(res)` → 204
- `fail(res, status, error)` → `{ success: false, error: { code?, message, details? } }`

Validation errors raised by `validateBody/validateQuery/validateParams`
(or any thrown `ZodError`) are normalised by `errorHandler` to a 400 with
`error.code = "VALIDATION_ERROR"`.

## Adding a new feature

1. `src/features/<name>/<name>.{schemas,repository,service,routes,types}.ts`
2. Export the router from `<name>/index.ts`
3. Register it in `src/features/index.ts` via `router.use(<name>Router)`
