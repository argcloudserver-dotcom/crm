import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok } from "../../shared/utils/response";
import { recordHeartbeat, startOfflineSweeper } from "./heartbeat.service";

const router = Router();

startOfflineSweeper();

router.post(
  "/heartbeat",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await recordHeartbeat(req.currentUser!.id);
    return ok(res, result);
  }),
);

export default router;
