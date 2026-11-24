import { getDb } from "../config/db.js";
import { env } from "../config/env.js";
import type { DatabaseStatus, HealthStatus } from "../types/index.js";

async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    await getDb().command({ ping: 1 });
    return "up";
  } catch {
    return "down";
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const database = await checkDatabase();

  return {
    status: database === "up" ? "ok" : "degraded",
    service: "shobujbondhu-server",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database: { status: database },
  };
}
