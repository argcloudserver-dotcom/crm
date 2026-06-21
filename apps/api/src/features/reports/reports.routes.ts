import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok } from "../../shared/utils/response";
import { validateQuery } from "../../shared/utils/validate";
import { reportsQuery } from "./reports.schemas";
import * as service from "./reports.service";

const router = Router();

router.get(
  "/reports/sales",
  requireAuth,
  withPermission("reports.view"),
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.buildSalesReport(req.query)),
  ),
);

router.get(
  "/reports/leads",
  requireAuth,
  withPermission("reports.view"),
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.buildLeadsReport(req.query)),
  ),
);

router.get(
  "/reports/resale",
  requireAuth,
  withPermission("reports.view"),
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.buildResaleReport(req.query)),
  ),
);

router.get(
  "/reports/trends",
  requireAuth,
  withPermission("reports.view"),
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.buildTrendsReport(req.query)),
  ),
);

router.get(
  "/reports/projects",
  requireAuth,
  withPermission("reports.view"),
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.buildProjectsReport(req.query)),
  ),
);

export default router;