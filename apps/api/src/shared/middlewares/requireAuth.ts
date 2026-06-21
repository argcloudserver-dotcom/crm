import type { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "../../lib/auth/session";
import { fail } from "../utils/response";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: import("@workspace/db").User | null;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    fail(res, 401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    return;
  }
  if (user.status !== "active") {
    fail(res, 403, { code: "INACTIVE_ACCOUNT", message: "Account not active" });
    return;
  }
  req.currentUser = user;
  next();
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromRequest(req);
  req.currentUser = user;
  next();
}
