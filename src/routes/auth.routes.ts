import { Router } from "express";
import { requireAuth, type AuthContext } from "../middleware/require-auth";

export const authRouter = Router();

authRouter.get("/me", requireAuth, (_req, res) => {
  const { user, session } = res.locals.auth as AuthContext;
  res.setHeader("Cache-Control", "no-store");
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
    },
    session: session
      ? {
          id: session.id,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
        }
      : null,
  });
});
