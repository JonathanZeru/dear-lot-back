import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sessions = await prisma.session.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: {
          select: {
            singles: true,
            rajshrees: true,
            choices: true,
            results: true
          }
        },
        results: {
          orderBy: { category: "asc" }
        }
      },
    });

    return NextResponse.json({ 
      success: true,
      sessions: sessions.map((
        session: { 
          id: any; 
          name: any; 
          drawTime: any; 
          active: any; 
          date: any; 
          _count: { singles: any; rajshrees: any; choices: any; results: any; }; results: any; }) => ({
        id: session.id,
        name: session.name,
        drawTime: session.drawTime,
        active: session.active,
        date: session.date,
        stats: {
          singleBets: session._count.singles,
          rajshreeBets: session._count.rajshrees,
          choiceBets: session._count.choices,
          results: session._count.results
        },
        results: session.results
      }))
    });

  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch sessions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
