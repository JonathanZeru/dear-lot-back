import { NextResponse } from "next/server";
import { verifyToken } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const decoded = verifyToken(token);
  
  return NextResponse.json({
    tokenProvided: !!token,
    tokenLength: token.length,
    decoded,
    envKeyExists: !!process.env.JWT_SECRET_KEY,
    envKeyLength: process.env.JWT_SECRET_KEY?.length
  });
}