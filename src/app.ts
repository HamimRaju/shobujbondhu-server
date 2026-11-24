import cors from "cors";
import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { getAuth } from "./config/auth.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { apiRouter } from "./routes/index.js";
import { AppError } from "./utils/app-error.js";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([env.CLIENT_URL, ...env.CORS_ORIGINS]);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server) are allowed.
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new AppError(403, "CORS_ORIGIN_NOT_ALLOWED", "Origin is not allowed by CORS policy."),
        );
      },
      credentials: true,
    }),
  );

  // Better Auth must receive the raw request body for its own parsing.
  app.use("/api/auth", authRouter);
  app.all("/api/auth/{*path}", toNodeHandler(getAuth()));

  app.use(express.json({ limit: "100kb" }));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
