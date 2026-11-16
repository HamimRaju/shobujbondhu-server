import { Router } from "express";
import {
  getCurrentProfile,
  updateCurrentProfile,
} from "../controllers/profile.controller";
import { requireSessionAuth } from "../middleware/require-auth";
import { validateBody } from "../middleware/validate-request";
import { updateProfileSchema } from "../validators/profile.validator";

export const profileRouter = Router();

profileRouter.get("/", requireSessionAuth, getCurrentProfile);
profileRouter.patch(
  "/",
  requireSessionAuth,
  validateBody(updateProfileSchema),
  updateCurrentProfile,
);
