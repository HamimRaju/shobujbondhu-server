import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/** Validates req.body against a Zod schema; failures go to the error handler as a ZodError. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validates route parameters and forwards failures to the error handler. */
export function validateParams(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(result.error);
      return;
    }
    next();
  };
}
