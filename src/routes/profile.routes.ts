import { Router } from "express";
import {
  getCurrentProfile,
  updateCurrentProfile,
} from "../controllers/profile.controller.js";
import { requireSessionAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate-request.js";
import { updateProfileSchema } from "../validators/profile.validator.js";

export const profileRouter = Router();

profileRouter.get("/", requireSessionAuth, getCurrentProfile);
profileRouter.patch(
  "/",
  requireSessionAuth,
  validateBody(updateProfileSchema),
  updateCurrentProfile,
);
