import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok, noContent, fail } from "../../shared/utils/response";
import { getAppUrl } from "../../shared/utils/getAppUrl";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/utils/validate";
import {
  listUsersQuery,
  rejectUserBody,
  updateUserBody,
  userIdParams,
} from "./users.schemas";
import * as service from "./users.service";

const router = Router();

router.get(
  "/users",
  requireAuth,
  withPermission("users.view"),
  validateQuery(listUsersQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.listUsers(req.query as never)),
  ),
);

router.get(
  "/users/pending",
  requireAuth,
  withPermission("users.manage"),
  asyncHandler(async (_req, res) => ok(res, await service.listPendingUsers())),
);

router.get(
  "/users/:userId",
  requireAuth,
  withPermission("users.view"),
  validateParams(userIdParams),
  asyncHandler(async (req, res) => {
    const user = await service.getUser(req.params.userId);
    if (!user) {
      return fail(res, 404, { code: "NOT_FOUND", message: "User not found" });
    }
    return ok(res, user);
  }),
);

router.patch(
  "/users/:userId",
  requireAuth,
  validateParams(userIdParams),
  validateBody(updateUserBody),
  asyncHandler(async (req, res) => {
    const caller = req.currentUser as { id: string; permissions: string[] };

    // self edit allowed; editing others requires users.manage
    if (
      req.params.userId !== caller.id &&
      !caller.permissions?.includes("users.manage")
    ) {
      return fail(res, 403, { code: "FORBIDDEN", message: "Forbidden" });
    }

    const updated = await service.updateUser(req.params.userId, req.body, caller);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "User not found" });
    }
    return ok(res, updated);
  }),
);

router.delete(
  "/users/:userId",
  requireAuth,
  withPermission("users.manage"),
  validateParams(userIdParams),
  asyncHandler(async (req, res) => {
    await service.deleteUser(req.params.userId);
    return noContent(res);
  }),
);

router.post(
  "/users/:userId/approve",
  requireAuth,
  withPermission("users.manage"),
  validateParams(userIdParams),
  asyncHandler(async (req, res) => {
    const updated = await service.approveUser(
      req.params.userId,
      req.currentUser!.id,
      getAppUrl(req),
    );
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "User not found" });
    }
    return ok(res, updated);
  }),
);

router.post(
  "/users/:userId/reject",
  requireAuth,
  withPermission("users.manage"),
  validateParams(userIdParams),
  validateBody(rejectUserBody),
  asyncHandler(async (req, res) => {
    const updated = await service.rejectUser(req.params.userId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "User not found" });
    }
    return ok(res, updated);
  }),
);

export default router;