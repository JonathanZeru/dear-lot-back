// src/app/api/bookings/history/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const [singles, rajshrees, choices] = await Promise.all([
    prisma.singleBooking.findMany({
      where: { userId: auth.id },
      include: { session: { select: { name: true, date: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rajshreeBooking.findMany({
      where: { userId: auth.id },
      include: { session: { select: { name: true, date: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.choiceBooking.findMany({
      where: { userId: auth.id },
      include: { session: { select: { name: true, date: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    })
  ]);

  return NextResponse.json({
    singles,
    rajshrees,
    choices
  });
}