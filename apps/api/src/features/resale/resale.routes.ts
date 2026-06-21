import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { created, fail, noContent, ok } from "../../shared/utils/response";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/utils/validate";
import {
  assignResaleBody,
  createPhotoBody,
  createResaleBody,
  listResaleQuery,
  photoParams,
  unitIdParams,
  updateResaleBody,
} from "./resale.schemas";
import * as service from "./resale.service";

const router = Router();

router.get(
  "/resale",
  requireAuth,
  withPermission("resale.view"),
  validateQuery(listResaleQuery),
  asyncHandler(async (req, res) => {
    const result = await service.listUnits(
      req.currentUser!.id,
      req.currentUser!.role,
      req.query as never,
    );
    return ok(res, result);
  }),
);

router.post(
  "/resale",
  requireAuth,
  withPermission("resale.manage"),
  validateBody(createResaleBody),
  asyncHandler(async (req, res) =>
    created(res, await service.createUnit(req.currentUser!.id, req.body)),
  ),
);

router.get(
  "/resale/:unitId",
  requireAuth,
  withPermission("resale.view"),
  validateParams(unitIdParams),
  asyncHandler(async (req, res) => {
    const result = await service.getUnit(
      req.params.unitId,
      req.currentUser!.id,
      req.currentUser!.role,
    );
    if (!result.ok) return fail(res, result.status, { message: result.reason });
    return ok(res, result.unit);
  }),
);

router.patch(
  "/resale/:unitId",
  requireAuth,
  withPermission("resale.manage"),
  validateParams(unitIdParams),
  validateBody(updateResaleBody),
  asyncHandler(async (req, res) => {
    const updated = await service.updateUnit(req.params.unitId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Unit not found" });
    }
    return ok(res, updated);
  }),
);

router.post(
  "/resale/:unitId/assign",
  requireAuth,
  withPermission("resale.manage"),
  validateParams(unitIdParams),
  validateBody(assignResaleBody),
  asyncHandler(async (req, res) => {
    if (!service.isAdmin(req.currentUser!.role)) {
      return fail(res, 403, { message: "Only admins can assign units" });
    }
    const updated = await service.assignUnit(req.params.unitId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Unit not found" });
    }
    return ok(res, updated);
  }),
);

router.delete(
  "/resale/:unitId",
  requireAuth,
  withPermission("resale.manage"),
  validateParams(unitIdParams),
  asyncHandler(async (req, res) => {
    await service.deleteUnit(req.params.unitId);
    return noContent(res);
  }),
);

router.post(
  "/resale/:unitId/photos",
  requireAuth,
  withPermission("resale.manage"),
  validateParams(unitIdParams),
  validateBody(createPhotoBody),
  asyncHandler(async (req, res) => {
    const result = await service.addPhoto(
      req.params.unitId,
      req.currentUser!.id,
      req.body,
    );
    if (!result.ok) return fail(res, 400, { message: result.reason });
    return created(res, result.photo);
  }),
);

router.delete(
  "/resale/:unitId/photos/:photoId",
  requireAuth,
  withPermission("resale.manage"),
  validateParams(photoParams),
  asyncHandler(async (req, res) => {
    await service.deletePhoto(req.params.unitId, req.params.photoId);
    return noContent(res);
  }),
);

export default router;