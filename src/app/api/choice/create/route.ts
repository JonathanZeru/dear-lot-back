// src/app/api/choice/create/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { numbers, qty, amount, sessionId } = await req.json();

  const booking = await prisma.choiceBooking.create({
    data: {
      numbers,
      qty,
      amount,
      userId: auth.id,
      sessionId
    }
  });

  return NextResponse.json({ success: true, booking });
}