import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok, created, noContent, fail } from "../../shared/utils/response";
import { validateBody, validateParams, validateQuery } from "../../shared/utils/validate";
import {
  createPlannerTaskBody,
  plannerListQuery,
  taskIdParams,
  updatePlannerTaskBody,
} from "./planner.schemas";
import * as service from "./planner.service";

const router = Router();

router.get(
  "/planner",
  requireAuth,
  validateQuery(plannerListQuery),
  asyncHandler(async (req, res) => {
    const tasks = await service.listTasks(
      req.currentUser!.id,
      req.query as unknown as ReturnType<typeof plannerListQuery.parse>,
    );
    return ok(res, tasks);
  }),
);

router.post(
  "/planner",
  requireAuth,
  validateBody(createPlannerTaskBody),
  asyncHandler(async (req, res) => {
    const task = await service.createTask(req.currentUser!.id, req.body);
    return created(res, task);
  }),
);

router.patch(
  "/planner/:taskId",
  requireAuth,
  validateParams(taskIdParams),
  validateBody(updatePlannerTaskBody),
  asyncHandler(async (req, res) => {
    const updated = await service.updateTask((req.params.taskId as string), req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Task not found" });
    }
    return ok(res, updated);
  }),
);

router.delete(
  "/planner/:taskId",
  requireAuth,
  validateParams(taskIdParams),
  asyncHandler(async (req, res) => {
    await service.deleteTask((req.params.taskId as string));
    return noContent(res);
  }),
);

export default router;
