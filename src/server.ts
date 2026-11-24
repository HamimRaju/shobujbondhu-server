import type { Server } from "node:http";
import { createApp } from "./app";
import { closeDatabase, connectToDatabase } from "./config/db";
import { env } from "./config/env";
import { prepareEventCollections } from "./config/migrations";

let server: Server | undefined;

async function start() {
  await connectToDatabase();
  console.log("MongoDB connected.");
  await prepareEventCollections();
  console.log("Event collections ready.");

  server = createApp().listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV}).`);
  });
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down.`);
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }
  await closeDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error(
    `[unhandledRejection] ${reason instanceof Error ? reason.name : "UnknownReason"}`,
  );
});

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to start server.");
  process.exit(1);
});
