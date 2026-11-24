import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import type { ApiErrorBody } from "../types/index.js";
import { AppError } from "../utils/app-error.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "The requested route does not exist."));
};

type ClientHttpError = Error & { status: number; expose: boolean };

/** Errors raised by body-parser and similar libraries (malformed JSON, payload too large). */
function isClientHttpError(error: unknown): error is ClientHttpError {
  if (!(error instanceof Error)) return false;
  const { status, expose } = error as Partial<ClientHttpError>;
  return (
    typeof status === "number" && status >= 400 && status < 500 && expose === true
  );
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let statusCode = 500;
  let body: ApiErrorBody = {
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong." },
  };

  if (error instanceof ZodError) {
    statusCode = 400;
    body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      },
    };
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    body = { error: { code: error.code, message: error.message } };
  } else if (isClientHttpError(error)) {
    statusCode = error.status;
    body = { error: { code: "BAD_REQUEST", message: error.message } };
  }

  if (statusCode >= 500) {
    // Never log request data or connection details; production logs only the error name.
    if (isProduction) {
      console.error(`[error] ${error instanceof Error ? error.name : "UnknownError"}`);
    } else {
      console.error("[error]", error);
    }
  }

  res.status(statusCode).json(body);
};
