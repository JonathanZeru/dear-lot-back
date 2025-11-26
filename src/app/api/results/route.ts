import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  try {
    const results = await prisma.lotteryResult.findMany({
      where: sessionId ? { sessionId } : {},
      include: {
        session: {
          select: {
            name: true,
            drawTime: true,
            date: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}