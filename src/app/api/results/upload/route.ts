//results/upload/route.ts
import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { calculateWinnings } from "../../../../../lib/winning";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, results } = await req.json();
  // results = [{ category: "1st", number: 123 }, ...]

  const created = [];

  for (const r of results) {
    const res = await prisma.lotteryResult.create({
      data: {
        sessionId,
        category: r.category,
        number: r.number
      }
    });

    created.push(res);
  }

  await calculateWinnings(sessionId);

  return NextResponse.json({ success: true, created });
}
