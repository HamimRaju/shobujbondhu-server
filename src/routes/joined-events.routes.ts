import { Router } from "express";
import { getJoinedEvents } from "../controllers/joined-events.controller.js";
import { requireJwtSessionAuth } from "../middleware/require-auth.js";

export const joinedEventsRouter = Router();

joinedEventsRouter.get("/", requireJwtSessionAuth, getJoinedEvents);
