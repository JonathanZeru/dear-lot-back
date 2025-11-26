// src/app/api/sessions/update/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, active } = await req.json();

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { active }
  });

  return NextResponse.json({ success: true, session });
}