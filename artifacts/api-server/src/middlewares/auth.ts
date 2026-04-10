import { Request, Response, NextFunction } from "express";
import { getUserFromToken } from "../routes/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Session expired or invalid" });
  (req as any).user = user;
  next();
}
