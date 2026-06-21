import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../../lib/logger";
import { fail } from "./response";

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, 404, { code: "NOT_FOUND", message: "Route not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    fail(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
      details: err.flatten(),
    });
    return;
  }

  const status =
    typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 500;

  const isProd = process.env.NODE_ENV === "production";

  // FIX: 5xx errors — log full details server-side,
  //      never leak message/stack to client in production
  if (status >= 500) {
    logger.error({ err }, "Unhandled error");
    fail(res, 500, {
      code: "INTERNAL_SERVER_ERROR",
      message: isProd
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Internal server error",
      ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
    });
    return;
  }

  // FIX: 4xx errors — safe to return message, hide stack in production
  const message =
    err instanceof Error ? err.message : "An error occurred";

  // AUDIT FIX (v13): propagate optional `reason` field from HttpError.
  const reason = (err as { reason?: string }).reason;

  fail(res, status, {
    code: (err as { code?: string }).code ?? "ERROR",
    message,
    ...(reason ? { reason } : {}),
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
}
