// src/app/api/rajshree/create/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { series, number, qty, amount, category, sessionId } = await req.json();

  const booking = await prisma.rajshreeBooking.create({
    data: {
      series,
      number,
      qty,
      amount,
      userId: auth.id,
      category: category,
      sessionId
    }
  });

  return NextResponse.json({ success: true, booking });
}