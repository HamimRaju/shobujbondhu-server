import { Router } from "express";
import { eventsRouter } from "./events.routes";
import { healthRouter } from "./health.routes";
import { joinedEventsRouter } from "./joined-events.routes";
import { profileRouter } from "./profile.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/joined-events", joinedEventsRouter);
apiRouter.use("/profile", profileRouter);
