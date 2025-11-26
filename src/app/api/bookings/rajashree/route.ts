import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { series, number, qty, amount, category, sessionId } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.balance < amount)
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  await prisma.user.update({
    where: { id: auth.id },
    data: { balance: user.balance - amount }
  });

  const booking = await prisma.rajshreeBooking.create({
    data: {
      series,
      number,
      qty,
      category: category,
      amount,
      userId: auth.id,
      sessionId
    }
  });

  return NextResponse.json({ success: true, booking });
}
