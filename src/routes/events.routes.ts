import { Router } from "express";
import {
  createEvent,
  deleteEvent,
  getMyEvents,
  updateEvent,
} from "../controllers/events.controller";
import {
  getJoinedEvents,
  joinEvent,
} from "../controllers/joined-events.controller";
import { requireAuth, requireJwtAuth } from "../middleware/require-auth";
import {
  validateBody,
  validateParams,
} from "../middleware/validate-request";
import {
  createEventSchema,
  eventIdParamsSchema,
  updateEventSchema,
} from "../validators/event.validator";

export const eventsRouter = Router();

eventsRouter.post(
  "/",
  requireAuth,
  validateBody(createEventSchema),
  createEvent,
);

eventsRouter.get("/my-events", requireJwtAuth, getMyEvents);
eventsRouter.get("/joined", requireJwtAuth, getJoinedEvents);
eventsRouter.post(
  "/:id/join",
  requireJwtAuth,
  validateParams(eventIdParamsSchema),
  joinEvent,
);
eventsRouter.patch(
  "/:id",
  requireJwtAuth,
  validateParams(eventIdParamsSchema),
  validateBody(updateEventSchema),
  updateEvent,
);
eventsRouter.delete(
  "/:id",
  requireJwtAuth,
  validateParams(eventIdParamsSchema),
  deleteEvent,
);
