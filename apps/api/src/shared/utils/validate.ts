import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, z } from "zod";
import { fail } from "./response";

export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      fail(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data as z.infer<S>;
    next();
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      fail(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: result.error.flatten(),
      });
      return;
    }
    Object.assign(req.query, result.data);
    next();
  };
}

export function validateParams<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      fail(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Invalid route parameters",
        details: result.error.flatten(),
      });
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
}
