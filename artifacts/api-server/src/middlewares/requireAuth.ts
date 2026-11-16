import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  const testUserId = process.env.NODE_ENV === "test" && typeof req.headers["x-test-user-id"] === "string"
    ? req.headers["x-test-user-id"]
    : undefined;
  const claimUserId = auth?.sessionClaims?.userId;
  const userId = typeof claimUserId === "string" ? claimUserId : auth?.userId || testUserId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};