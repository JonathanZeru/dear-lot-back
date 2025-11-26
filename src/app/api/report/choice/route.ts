// src/app/api/report/choice/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const whereClause = sessionId ? { sessionId } : {};

  const choices = await prisma.choiceBooking.findMany({
    where: whereClause,
    include: {
      user: { select: { userId: true, name: true } },
      session: { select: { name: true, date: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ choices });
}