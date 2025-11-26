// src/app/api/bookings/history/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";
export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { number, qty, amount, category, sessionId } = await req.json();

  // get user
  const user = await prisma.user.findUnique({
    where: { id: auth.id }
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // check balance
  if (user.balance < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // deduct balance
  await prisma.user.update({
    where: { id: auth.id },
    data: { balance: user.balance - amount }
  });

  // create booking
  const booking = await prisma.singleBooking.create({
    data: {
      number,
      qty,
      amount,
      category: category,
      userId: auth.id,
      sessionId
    }
  });

  return NextResponse.json({ success: true, booking });
}
