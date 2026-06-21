import { Router } from "express";
import { withPermission } from "@workspace/permissions";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { fail, ok } from "../../shared/utils/response";
import { validateBody, validateParams } from "../../shared/utils/validate";
import {
  roleParams,
  setOverrideBody,
  updateRolePermissionBody,
  userIdParams,
} from "./permissions.schemas";
import * as service from "./permissions.service";

const router = Router();

router.get(
  "/permissions/matrix",
  requireAuth,
  withPermission("permissions.manage"),
  asyncHandler(async (_req, res) => ok(res, await service.getMatrix())),
);

router.patch(
  "/permissions/role/:role",
  requireAuth,
  withPermission("permissions.manage"),
  validateParams(roleParams),
  validateBody(updateRolePermissionBody),
  asyncHandler(async (req, res) => {
    const role = req.params.role as string;
    if (!service.isValidRole(role)) {
      return fail(res, 400, { message: "Invalid role" });
    }
    await service.updateRolePermission(role, req.body, req.currentUser!.id, req);
    return ok(res, { ok: true });
  }),
);

router.get(
  "/permissions/user/:userId",
  requireAuth,
  withPermission("permissions.manage"),
  validateParams(userIdParams),
  asyncHandler(async (req, res) => {
    const result = await service.getUserPermissions((req.params.userId as string));
    if (!result.ok) {
      return fail(res, 404, { code: "NOT_FOUND", message: result.reason });
    }
    return ok(res, result.data);
  }),
);

router.post(
  "/permissions/user/:userId/override",
  requireAuth,
  withPermission("permissions.manage"),
  validateParams(userIdParams),
  validateBody(setOverrideBody),
  asyncHandler(async (req, res) => {
    await service.setOverride(
      (req.params.userId as string),
      req.body,
      req.currentUser!.id,
      req,
    );
    return ok(res, { ok: true });
  }),
);

router.post(
  "/permissions/role/:role/reset",
  requireAuth,
  withPermission("permissions.manage"),
  validateParams(roleParams),
  asyncHandler(async (req, res) => {
    const role = req.params.role as string;
    if (!service.isValidRole(role)) {
      return fail(res, 400, { message: "Invalid role" });
    }
    await service.resetRole(role, req.currentUser!.id, req);
    return ok(res, { ok: true });
  }),
);

router.get(
  "/permissions/me",
  requireAuth,
  asyncHandler(async (req, res) =>
    ok(
      res,
      await service.getMyPermissions(req.currentUser!.id, req.currentUser!.role),
    ),
  ),
);

export default router;
