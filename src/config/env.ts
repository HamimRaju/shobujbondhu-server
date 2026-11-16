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
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin === origin &&
      !url.username &&
      !url.password
    );
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
  BETTER_AUTH_SECRET: z.string().trim().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z
    .string()
    .trim()
    .url("must be a valid http(s) origin")
    .refine(isValidOrigin, "must be an http(s) origin without a path"),
  CLIENT_URL: z
    .string()
    .trim()
    .url("must be a valid http(s) origin")
    .refine(isValidOrigin, "must be an http(s) origin without a path"),
  GOOGLE_CLIENT_ID: z.string().trim().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional().default(""),
  CORS_ORIGINS: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform(parseOrigins)
    .refine(
      (origins) => origins.every(isValidOrigin),
      "every origin must be a valid http(s) origin, e.g. http://localhost:3000",
    ),
}).refine(
  (values) =>
    Boolean(values.GOOGLE_CLIENT_ID) === Boolean(values.GOOGLE_CLIENT_SECRET),
  {
    message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be empty",
    path: ["GOOGLE_CLIENT_ID"],
  },
);

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
