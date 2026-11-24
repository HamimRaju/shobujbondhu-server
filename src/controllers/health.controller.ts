import { getHealthStatus } from "../services/health.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getHealth = asyncHandler(async (_req, res) => {
  const health = await getHealthStatus();
  res.status(health.status === "ok" ? 200 : 503).json(health);
});
