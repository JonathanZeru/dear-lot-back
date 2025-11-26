// src/app/api/results/list/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Get session results
  const results = await prisma.lotteryResult.findMany({
    where: { sessionId },
    orderBy: { category: "asc" }
  });

  // Get user's bookings for this session
  const [singles, rajshrees, choices] = await Promise.all([
    prisma.singleBooking.findMany({
      where: { sessionId, userId: auth.id }
    }),
    prisma.rajshreeBooking.findMany({
      where: { sessionId, userId: auth.id }
    }),
    prisma.choiceBooking.findMany({
      where: { sessionId, userId: auth.id }
    })
  ]);

  return NextResponse.json({
    results,
    bookings: {
      singles,
      rajshrees,
      choices
    }
  });
}