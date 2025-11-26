// choice/create/route.ts
import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { numbers, qty, amount, sessionId } = await req.json();
  // numbers = "12,23,45" (string)

  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.balance < amount)
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  await prisma.user.update({
    where: { id: auth.id },
    data: { balance: user.balance - amount }
  });

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
