import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok } from "../../shared/utils/response";
import * as service from "./dashboard.service";

const router = Router();

router.get(
  "/dashboard/stats",
  requireAuth,
  withPermission("dashboard.view"),
  asyncHandler(async (_req, res) => ok(res, await service.getStats())),
);

router.get(
  "/dashboard/pipeline",
  requireAuth,
  withPermission("dashboard.view"),
  asyncHandler(async (_req, res) => ok(res, await service.getPipeline())),
);

router.get(
  "/dashboard/top-performers",
  requireAuth,
  withPermission("dashboard.view"),
  asyncHandler(async (_req, res) => ok(res, await service.getTopPerformers())),
);

router.get(
  "/dashboard/recent-activity",
  requireAuth,
  withPermission("dashboard.view"),
  asyncHandler(async (_req, res) => ok(res, await service.getRecentActivity())),
);

export default router;