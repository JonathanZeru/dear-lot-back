import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const singles = await prisma.singleBooking.findMany({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            userId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ 
      success: true,
      singles: singles.map(single => ({
        id: single.id,
        number: single.number,
        qty: single.qty,
        amount: single.amount,
        userId: single.userId,
        sessionId: single.sessionId,
        user: single.user,
        createdAt: single.createdAt,
        totalAmount: single.amount * single.qty
      }))
    });

  } catch (error) {
    console.error("List singles error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch singles",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}