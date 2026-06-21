import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok, fail } from "../../shared/utils/response";
import { validateParams } from "../../shared/utils/validate";
import { notificationIdParams } from "./notifications.schemas";
import * as service from "./notifications.service";

const router = Router();

router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await service.listNotifications(req.currentUser!.id);
    return ok(res, items);
  }),
);

router.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  validateParams(notificationIdParams),
  asyncHandler(async (req, res) => {
    const updated = await service.markNotificationRead(
      (req.params.notificationId as string),
      req.currentUser!.id,
    );
    if (!updated) {
      return fail(res, 404, {
        code: "NOT_FOUND",
        message: "Notification not found",
      });
    }
    return ok(res, updated);
  }),
);

router.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await service.markAllNotificationsRead(req.currentUser!.id);
    return ok(res, { success: true });
  }),
);

export default router;
