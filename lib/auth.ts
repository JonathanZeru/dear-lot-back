// lib/auth.ts
import jwt from "jsonwebtoken";

interface AuthPayload {
  id: string;
  userId: string;
  iat?: number;
  exp?: number;
  role: string;
}

export async function authUser(req: Request): Promise<AuthPayload | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;

    // Make sure we're using JWT_SECRET_KEY (not JWT_SECRET)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    return decoded as AuthPayload;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export function signToken(payload: any) {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    expiresIn: "7d"
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY as string);
  } catch {
    return null;
  }
}