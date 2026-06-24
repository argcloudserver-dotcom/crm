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
  multiAssignBody,
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

    // FIX: support both .xlsx and .csv uploads. The web modal accepts CSV,
    // so parsing only as xlsx caused valid CSV uploads to 400.
    const filename = (req.file.originalname || "").toLowerCase();
    const mimetype = (req.file.mimetype || "").toLowerCase();
    const isCsv =
      filename.endsWith(".csv") ||
      mimetype === "text/csv" ||
      mimetype === "application/csv";

    const workbook = new ExcelJS.Workbook();
    try {
      if (isCsv) {
        // ExcelJS csv.read expects a Readable stream.
        const { Readable } = await import("stream");
        const stream = Readable.from(req.file.buffer);
        await workbook.csv.read(stream as unknown as NodeJS.ReadableStream);
      } else {
        await workbook.xlsx.load(req.file.buffer);
      }
    } catch {
      return fail(res, 400, {
        code: "INVALID_WORKBOOK",
        message: isCsv
          ? "File is not a valid .csv"
          : "File is not a valid .xlsx workbook",
      });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return fail(res, 400, {
        code: "EMPTY_WORKBOOK",
        message: "Workbook is empty",
      });
    }

    // FIX: ExcelJS returns objects for hyperlinks, rich text, formulas, dates.
    // Normalize to a plain string so downstream `String(v).trim()` is safe.
    const cellToString = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object") {
        const obj = v as {
          text?: unknown;
          result?: unknown;
          richText?: Array<{ text?: string }>;
          hyperlink?: unknown;
        };
        if (typeof obj.text === "string") return obj.text;
        if (Array.isArray(obj.richText)) {
          return obj.richText.map((r) => r?.text ?? "").join("");
        }
        if (obj.result !== undefined && obj.result !== null) {
          return String(obj.result);
        }
        if (obj.hyperlink !== undefined) return String(obj.hyperlink);
        return "";
      }
      return String(v);
    };

    const header: string[] = [];
    const rows: Record<string, unknown>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as unknown[];

      if (rowNumber === 1) {
        values.forEach((v, i) => {
          if (i > 0) header[i - 1] = cellToString(v);
        });
      } else {
        const obj: Record<string, unknown> = {};
        values.forEach((v, i) => {
          if (i > 0 && header[i - 1]) {
            obj[header[i - 1]] = cellToString(v);
          }
        });
        rows.push(obj);
      }
    });

    const result = await service.bulkImport(req, rows);
    return ok(res, result);
  }),
);


router.post(
  "/leads/:leadId/assignments",
  requireAuth,
  withPermission("leads.assign"),
  validateParams(leadIdParams),
  validateBody(multiAssignBody),
  asyncHandler(async (req, res) => {
    const result = await service.multiAssignLead(req, req.params.leadId, req.body);
    if (!result) return fail(res, 404, { code: "NOT_FOUND", message: "Lead not found" });
    if ("error" in result) {
      return fail(res, 403, { code: "FORBIDDEN", message: result.error });
    }
    return created(res, result);
  }),
);

router.get(
  "/leads/:leadId/assignments",
  requireAuth,
  withPermission("leads.view"),
  validateParams(leadIdParams),
  asyncHandler(async (req, res) =>
    ok(res, await service.listAssignmentHistory(req.params.leadId)),
  ),
);

export default router;
