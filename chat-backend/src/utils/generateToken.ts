import jwt from "jsonwebtoken";

export default function generateToken(user: { id: string; username: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: "14d" });
}
