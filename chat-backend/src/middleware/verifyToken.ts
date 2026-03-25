import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = { id: string; username: string };

export default function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }
  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration." });
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}
