// users/change-password/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { comparePIN, hashPIN } from "../../../../../lib/utils";

export async function POST(req: Request) {
  try {
    const { userId, oldPin, newPin } = await req.json();

    if (!userId || !oldPin || !newPin) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await comparePIN(oldPin, user.pinHash);
    if (!match) return NextResponse.json({ error: "Old PIN is wrong" }, { status: 400 });

    const newPinHash = await hashPIN(newPin);

    await prisma.user.update({
      where: { userId },
      data: { pinHash: newPinHash },
    });

    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
