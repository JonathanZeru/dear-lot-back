import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { comparePIN } from "../../../../../lib/utils";
import { signToken } from "../../../../../lib/auth";
 
export async function POST(req: Request) {
  const { userId, pin } = await req.json();

  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const match = await comparePIN(pin, user.pinHash);
  if (!match) return NextResponse.json({ error: "Wrong PIN" }, { status: 400 });

  // FIX: Include role in the token payload
  const token = signToken({ 
    id: user.id, 
    userId: user.userId,
    role: user.role  // ← This was missing!
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      userId: user.userId,
      role: user.role,
      balance: user.balance,
      referralCode: user.referralCode,
      referredBy: user.referredBy
    },
  });
}