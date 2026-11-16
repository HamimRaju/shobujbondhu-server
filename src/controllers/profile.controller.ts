import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { getAuth } from "../config/auth";
import type { AuthContext } from "../middleware/require-auth";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

function profileFromResponse(res: Response) {
  const { user } = res.locals.auth as AuthContext;
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt ?? null,
  };
}

export const getCurrentProfile = asyncHandler(async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { profile: profileFromResponse(res) } });
});

export const updateCurrentProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const authContext = res.locals.auth as AuthContext;
    const headers = fromNodeHeaders(req.headers);
    const result = await getAuth().api.updateUser({
      headers,
      body: req.body,
    });

    if (!result.status) {
      throw new AppError(
        500,
        "PROFILE_UPDATE_FAILED",
        "The profile could not be updated.",
      );
    }

    // Re-read the user from Better Auth after its supported update API has
    // persisted the change; do not construct a response from request data.
    const session = await getAuth().api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!session || session.user.id !== authContext.user.id) {
      throw new AppError(401, "UNAUTHORIZED", "An active matching session is required.");
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      data: {
        profile: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
          createdAt: session.user.createdAt,
        },
      },
    });
  },
);
