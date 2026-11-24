import { Router } from "express";
import { getJoinedEvents } from "../controllers/joined-events.controller";
import { requireJwtSessionAuth } from "../middleware/require-auth";

export const joinedEventsRouter = Router();

joinedEventsRouter.get("/", requireJwtSessionAuth, getJoinedEvents);
