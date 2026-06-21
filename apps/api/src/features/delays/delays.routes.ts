import { Router } from "express";
import { withPermission } from "@workspace/permissions";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { created, fail, ok } from "../../shared/utils/response";
import { validateBody, validateParams } from "../../shared/utils/validate";
import {
  createDelayBody,
  delayIdParams,
  leadIdParams,
  reviewDelayBody,
} from "./delays.schemas";
import * as service from "./delays.service";

const router = Router();

router.get(
  "/delays",
  requireAuth,
  withPermission("leads.assign"),
  asyncHandler(async (_req, res) => ok(res, await service.listPendingDelays())),
);

router.post(
  "/leads/:leadId/delay",
  requireAuth,
  withPermission("leads.delay"),
  validateParams(leadIdParams),
  validateBody(createDelayBody),
  asyncHandler(async (req, res) => {
    const result = await service.requestDelay(req, (req.params.leadId as string), req.body);
    if (!result.ok) return fail(res, result.status, { message: result.reason });
    return created(res, result.delay);
  }),
);

router.patch(
  "/delays/:delayId",
  requireAuth,
  withPermission("leads.assign"),
  validateParams(delayIdParams),
  validateBody(reviewDelayBody),
  asyncHandler(async (req, res) => {
    const result = await service.reviewDelay(req, (req.params.delayId as string), req.body);
    if (!result.ok) return fail(res, 404, { message: result.reason });
    return ok(res, result.delay);
  }),
);

export default router;
