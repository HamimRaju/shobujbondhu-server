import "dotenv/config";
import { z } from "zod";

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "is required")
    .refine(
      (value) => /^mongodb(\+srv)?:\/\//.test(value),
      "must start with mongodb:// or mongodb+srv://",
    ),
  DB_NAME: z
    .string()
    .trim()
    .min(1, "is required")
    .regex(
      /^[^/\\. "$*<>:|?]+$/,
      'must not contain spaces or any of / \\ . " $ * < > : | ?',
    ),
  CORS_ORIGINS: z
    .string()
    .trim()
    .min(1, "is required (comma-separated list of allowed origins)")
    .transform(parseOrigins)
    .refine((origins) => origins.length > 0, "must contain at least one origin")
    .refine(
      (origins) => origins.every(isValidOrigin),
      "every origin must be a valid http(s) origin, e.g. http://localhost:3000",
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Only variable names and validation messages are printed, never values.
  const lines = parsed.error.issues.map(
    (issue) => `  - ${issue.path.map(String).join(".") || "env"}: ${issue.message}`,
  );
  console.error(
    ["Invalid or missing environment variables:", ...lines, "", "See .env.example for the expected variables."].join("\n"),
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
