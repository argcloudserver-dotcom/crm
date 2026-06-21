import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { ok, created, noContent, fail } from "../../shared/utils/response";
import { validateBody, validateParams } from "../../shared/utils/validate";
import {
  createProjectBody,
  projectIdParams,
  updateProjectBody,
} from "./projects.schemas";
import * as service from "./projects.service";

const router = Router();

router.get(
  "/projects",
  requireAuth,
  withPermission("projects.view"),
  asyncHandler(async (_req, res) => ok(res, await service.listProjects())),
);

router.post(
  "/projects",
  requireAuth,
  withPermission("projects.create"),
  validateBody(createProjectBody),
  asyncHandler(async (req, res) => {
    const project = await service.createProject(req.currentUser!.id, req.body);
    return created(res, project);
  }),
);

router.get(
  "/projects/:projectId",
  requireAuth,
  withPermission("projects.view"),
  validateParams(projectIdParams),
  asyncHandler(async (req, res) => {
    const project = await service.getProject(req.params.projectId);
    if (!project) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Project not found" });
    }
    return ok(res, project);
  }),
);

router.patch(
  "/projects/:projectId",
  requireAuth,
  withPermission("projects.update"),
  validateParams(projectIdParams),
  validateBody(updateProjectBody),
  asyncHandler(async (req, res) => {
    const updated = await service.updateProject(req.params.projectId, req.body);
    if (!updated) {
      return fail(res, 404, { code: "NOT_FOUND", message: "Project not found" });
    }
    return ok(res, updated);
  }),
);

router.delete(
  "/projects/:projectId",
  requireAuth,
  withPermission("projects.delete"),
  validateParams(projectIdParams),
  asyncHandler(async (req, res) => {
    await service.deleteProject(req.params.projectId);
    return noContent(res);
  }),
);

export default router;