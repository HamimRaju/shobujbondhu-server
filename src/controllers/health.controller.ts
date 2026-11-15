import { getHealthStatus } from "../services/health.service";
import { asyncHandler } from "../utils/async-handler";

export const getHealth = asyncHandler(async (_req, res) => {
  const health = await getHealthStatus();
  res.status(health.status === "ok" ? 200 : 503).json(health);
});
