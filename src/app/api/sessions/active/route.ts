//sessions/active/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET() {
  const session = await prisma.session.findFirst({
    where: { active: true },
    orderBy: { date: "desc" }
  });

  return NextResponse.json(session);
}
