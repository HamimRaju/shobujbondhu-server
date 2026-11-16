import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth, type AuthSession } from "../config/auth";
import { AppError } from "../utils/app-error";

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
    createdAt?: Date;
  };
  session?: AuthSession["session"];
};

async function verifyBearerUser(
  req: Parameters<RequestHandler>[0],
): Promise<AuthContext["user"]> {
  const authorization = req.get("authorization");
  const bearerMatch = authorization
    ? /^Bearer\s+([^\s]+)$/i.exec(authorization)
    : null;
  if (!bearerMatch) {
    throw new AppError(401, "UNAUTHORIZED", "A valid Bearer JWT is required.");
  }

  const { payload } = await getAuth().api.verifyJWT({
    body: { token: bearerMatch[1] },
  });
  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : "",
    emailVerified: payload.emailVerified === true,
    image: typeof payload.image === "string" ? payload.image : null,
  };
}

function authContextFromSession(session: AuthSession): AuthContext {
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      image: session.user.image ?? null,
      createdAt: session.user.createdAt,
    },
    session: session.session,
  };
}

/**
 * Validates either a Better Auth session cookie or a Better Auth-issued JWT.
 * User identity always comes from Better Auth, never from request data.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authorization = req.get("authorization");

    if (authorization !== undefined) {
      res.locals.auth = {
        user: await verifyBearerUser(req),
      } satisfies AuthContext;
      next();
      return;
    }

    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
      return;
    }

    res.locals.auth = authContextFromSession(session);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Requires a Bearer token and delegates verification to the Better Auth JWT
 * verifier in requireAuth. A session cookie alone is not sufficient here.
 */
export const requireJwtAuth: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  if (!authorization || !/^Bearer\s+[^\s]+$/i.test(authorization)) {
    next(new AppError(401, "UNAUTHORIZED", "A valid Bearer JWT is required."));
    return;
  }

  return requireAuth(req, res, next);
};

/**
 * Authenticates specifically with Better Auth's current session cookie. This
 * does not treat a JWT as a session and does not use Authorization claims.
 */
export const requireSessionAuth: RequestHandler = async (req, res, next) => {
  if (!req.headers.cookie) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
    return;
  }

  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!session) {
      next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
      return;
    }

    res.locals.auth = authContextFromSession(session);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Requires both a Better Auth-verified Bearer JWT and the corresponding live
 * Better Auth session cookie. This is needed for Better Auth's updateUser API,
 * which authorizes updates through its session middleware.
 */
export const requireJwtSessionAuth: RequestHandler = async (req, res, next) => {
  try {
    const jwtUser = await verifyBearerUser(req);
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true, disableRefresh: true },
    });

    if (!session || session.user.id !== jwtUser.id) {
      next(new AppError(401, "UNAUTHORIZED", "An active matching session is required."));
      return;
    }

    res.locals.auth = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        createdAt: session.user.createdAt,
      },
      session: session.session,
    } satisfies AuthContext;
    next();
  } catch (error) {
    next(error);
  }
};
