import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { getDb } from "./db.js";
import { env, isProduction } from "./env.js";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

function createAuthInstance() {
  return betterAuth({
    appName: "ShobujBondhu",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(getDb(), { transaction: false }),
    trustedOrigins: [env.CLIENT_URL, ...env.CORS_ORIGINS],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 6,
      maxPasswordLength: 128,
    },
    socialProviders: googleProvider,
    plugins: [
      jwt({
        jwt: {
          issuer: env.BETTER_AUTH_URL,
          audience: env.BETTER_AUTH_URL,
          expirationTime: "15m",
        },
      }),
    ],
    advanced: {
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const isSignUp = context.path === "/sign-up/email";
        const isProfileUpdate = context.path === "/update-user";
        if (!isSignUp && !isProfileUpdate) return;

        const body = context.body;
        if (
          (isSignUp || body.name !== undefined) &&
          (typeof body.name !== "string" || body.name.trim().length === 0)
        ) {
          throw new APIError("BAD_REQUEST", {
            message: "Name is required.",
          });
        }
        if (typeof body.name === "string" && body.name.trim().length > 120) {
          throw new APIError("BAD_REQUEST", {
            message: "Name must be 120 characters or fewer.",
          });
        }

        if (
          body.image !== undefined &&
          body.image !== null &&
          body.image !== ""
        ) {
          if (typeof body.image !== "string" || body.image.length > 2048) {
            throw new APIError("BAD_REQUEST", {
              message: "Profile photo must be a valid HTTP or HTTPS URL.",
            });
          }
          try {
            const imageURL = new URL(body.image);
            if (
              (imageURL.protocol !== "http:" && imageURL.protocol !== "https:") ||
              imageURL.username ||
              imageURL.password
            ) {
              throw new Error("Invalid photo URL");
            }
          } catch {
            throw new APIError("BAD_REQUEST", {
              message: "Profile photo must be a valid HTTP or HTTPS URL.",
            });
          }
        }

        if (isSignUp && (
          typeof body.password !== "string" ||
          body.password.length < 6 ||
          !/[A-Z]/.test(body.password) ||
          !/[a-z]/.test(body.password)
        )) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Password must be at least 6 characters and contain an uppercase and a lowercase letter.",
          });
        }

        if (typeof body.name === "string") body.name = body.name.trim();
      }),
    },
    onAPIError: {
      onError(error) {
        // Never log request bodies, tokens, passwords, or provider credentials.
        const name = error instanceof Error ? error.name : "UnknownError";
        console.error(`[auth-error] ${name}`);
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuthInstance> | undefined;

/**
 * Lazily initialize after connectToDatabase() has established the shared MongoDB connection.
 */
export function getAuth() {
  if (!authInstance) {
    authInstance = createAuthInstance();
  }

  return authInstance;
}

export type AuthSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuthInstance>["api"]["getSession"]>>
>;
