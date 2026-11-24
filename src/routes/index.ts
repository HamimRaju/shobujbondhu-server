import { Router } from "express";
import { eventsRouter } from "./events.routes.js";
import { healthRouter } from "./health.routes.js";
import { joinedEventsRouter } from "./joined-events.routes.js";
import { profileRouter } from "./profile.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/joined-events", joinedEventsRouter);
apiRouter.use("/profile", profileRouter);
