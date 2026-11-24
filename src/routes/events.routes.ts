import { Router } from "express";
import {
  createEvent,
  deleteEvent,
  getEvent,
  getMyEvents,
  getUpcomingEvents,
  updateEvent,
} from "../controllers/events.controller";
import {
  getEventParticipation,
  getJoinedEvents,
  joinEvent,
} from "../controllers/joined-events.controller";
import { requireJwtSessionAuth } from "../middleware/require-auth";
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

// Public reads: upcoming events never include a past date/time.
eventsRouter.get("/upcoming", getUpcomingEvents);
eventsRouter.get("/my-events", requireJwtSessionAuth, getMyEvents);
eventsRouter.get("/joined", requireJwtSessionAuth, getJoinedEvents);
eventsRouter.get(
  "/:id/participation",
  requireJwtSessionAuth,
  validateParams(eventIdParamsSchema),
  getEventParticipation,
);
eventsRouter.get("/:id", validateParams(eventIdParamsSchema), getEvent);

// Every event mutation requires a Better Auth-verified Bearer JWT.
eventsRouter.post(
  "/",
  requireJwtSessionAuth,
  validateBody(createEventSchema),
  createEvent,
);
eventsRouter.post(
  "/:id/join",
  requireJwtSessionAuth,
  validateParams(eventIdParamsSchema),
  joinEvent,
);
eventsRouter.patch(
  "/:id",
  requireJwtSessionAuth,
  validateParams(eventIdParamsSchema),
  validateBody(updateEventSchema),
  updateEvent,
);
eventsRouter.delete(
  "/:id",
  requireJwtSessionAuth,
  validateParams(eventIdParamsSchema),
  deleteEvent,
);
