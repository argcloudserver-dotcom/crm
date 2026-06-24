import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { withPermission } from "../../shared/middlewares/withPermission";
import * as svc from "./clients.service";
import { ClientCreateSchema, ClientUpdateSchema } from "./clients.schemas";

const ParamId = z.object({ id: z.string().uuid() });

export const clientsRouter = Router();

// AUDIT FIX (v7): paths were "/" and "/:id". The router is mounted at "/api"
// without an additional prefix, so those routes resolved to "/api" and
// "/api/:id" instead of "/api/clients" and "/api/clients/:id", producing 404s.
clientsRouter.get(
  "/clients",
  requireAuth,
  withPermission("clients.view"),
  async (req, res, n) => {
    try {
      res.json(await svc.list(req, req.query));
    } catch (e) {
      n(e);
    }
  }
);

clientsRouter.post(
  "/clients",
  requireAuth,
  withPermission("clients.create"),
  async (req, res, n) => {
    try {
      res.json(await svc.create(ClientCreateSchema.parse(req.body)));
    } catch (e) {
      n(e);
    }
  }
);

clientsRouter.patch(
  "/clients/:id",
  requireAuth,
  withPermission("clients.update"),
  async (req, res, n) => {
    try {
      const { id } = ParamId.parse(req.params);
      res.json(await svc.update(id, ClientUpdateSchema.parse(req.body)));
    } catch (e) {
      n(e);
    }
  }
);

clientsRouter.delete(
  "/clients/:id",
  requireAuth,
  withPermission("clients.delete"),
  async (req, res, n) => {
    try {
      const { id } = ParamId.parse(req.params);
      res.json(await svc.remove(id));
    } catch (e) {
      n(e);
    }
  }
);

export default clientsRouter;
