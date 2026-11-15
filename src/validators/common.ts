import { z } from "zod";

/** A 24-character hex string, the string form of a MongoDB ObjectId. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "must be a valid ObjectId");
