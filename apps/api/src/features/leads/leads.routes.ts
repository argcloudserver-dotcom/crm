import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
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
  assignLeadBody,
  createActivityBody,
  createLeadBody,
  leadIdParams,
  listLeadsQuery,
  updateLeadBody,
  updateLeadStatusBody,
} from "./leads.schemas";
import * as service from "./leads.service";

// FIX: reduced file size limit to 5MB for bulk import
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.get(
  "/leads",
  requireAuth,
  withPermission("leads.view"),
  validateQuery(listLeadsQuery),
  asyncHandler(async (req, res) =>
    ok(res, await service.listLeads(req, req.query)),
  ),
);

router.get(
  "/leads/kanban",
  requireAuth,
  withPermission("leads.view"),
  asyncHandler(async (req, res) => ok(res, await service.getKanban(req))),
);

router.post(
  "/leads",
  requireAuth,
  withPermission("leads.create"),
  validateBody(createLeadBody),
  asyncHandler(async (req, res) =>
    created(res, await service.createLead(req, req.body)),
  ),
);

router.get(
  "/leads/:leadId",
  requireAuth,
  withPermission("leads.view"),
  validateParams(leadIdParams),
  asyncHandler(async (req, res) => {
    const lead = await service.getLead(req, req.params.leadId);
    if (!lead) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
    }
    return ok(res, lead);
  }),
);

router.patch(
  "/leads/:leadId",
  requireAuth,
  withPermission("leads.update"),
  validateParams(leadIdParams),
  validateBody(updateLeadBody),
  asyncHandler(async (req, res) => {
    const updated = await service.updateLead(req, req.params.leadId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
    }
    return ok(res, updated);
  }),
);

router.delete(
  "/leads/:leadId",
  requireAuth,
  withPermission("leads.delete"),
  validateParams(leadIdParams),
  asyncHandler(async (req, res) => {
    await service.deleteLead(req.params.leadId);
    return noContent(res);
  }),
);

router.post(
  "/leads/:leadId/assign",
  requireAuth,
  withPermission("leads.update"),
  validateParams(leadIdParams),
  validateBody(assignLeadBody),
  asyncHandler(async (req, res) => {
    const updated = await service.assignLead(req, req.params.leadId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
    }
    return ok(res, updated);
  }),
);

router.patch(
  "/leads/:leadId/status",
  requireAuth,
  withPermission("leads.update"),
  validateParams(leadIdParams),
  validateBody(updateLeadStatusBody),
  asyncHandler(async (req, res) => {
    const updated = await service.updateLeadStatus(
      req,
      req.params.leadId,
      req.body,
    );
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
    }
    return ok(res, updated);
  }),
);

router.get(
  "/leads/:leadId/activities",
  requireAuth,
  withPermission("leads.view"),
  validateParams(leadIdParams),
  asyncHandler(async (req, res) =>
    ok(res, await service.listActivities(req.params.leadId)),
  ),
);

router.post(
  "/leads/:leadId/activities",
  requireAuth,
  withPermission("leads.edit"),
  validateParams(leadIdParams),
  validateBody(createActivityBody),
  asyncHandler(async (req, res) =>
    created(
      res,
      await service.createActivity(req, req.params.leadId, req.body),
    ),
  ),
);

// FIX: replaced XLSX with ExcelJS (CVE mitigation)
router.post(
  "/leads/bulk",
  requireAuth,
  withPermission("leads.import"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return fail(res, 400, {
        code: "FILE_REQUIRED",
        message: "No file uploaded",
      });
    }

    // FIX: use ExcelJS instead of XLSX
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return fail(res, 400, {
        code: "EMPTY_WORKBOOK",
        message: "Workbook is empty",
      });
    }

    // Parse rows (first row is header)
    const header: string[] = [];
    const rows: Record<string, unknown>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as unknown[];

      if (rowNumber === 1) {
        // Header row (Excel rows are 1-indexed, values array starts at index 1)
        values.forEach((v, i) => {
          if (i > 0) header[i - 1] = String(v ?? "");
        });
      } else {
        // Data rows
        const obj: Record<string, unknown> = {};
        values.forEach((v, i) => {
          if (i > 0 && header[i - 1]) {
            obj[header[i - 1]] = v;
          }
        });
        rows.push(obj);
      }
    });

    // Service layer will validate each row via Zod
    const result = await service.bulkImport(req, rows);
    return ok(res, result);
  }),
);

export default router;