import { Router } from "express";
import { authRouter } from "./auth.routes";
import { eventsRouter } from "./events.routes";
import { healthRouter } from "./health.routes";
import { joinedEventsRouter } from "./joined-events.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/joined-events", joinedEventsRouter);
