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

    const rajshrees = await prisma.rajshreeBooking.findMany({
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
      rajshrees: rajshrees.map(rajshree => ({
        id: rajshree.id,
        series: rajshree.series,
        number: rajshree.number,
        qty: rajshree.qty,
        amount: rajshree.amount,
        userId: rajshree.userId,
        sessionId: rajshree.sessionId,
        user: rajshree.user,
        createdAt: rajshree.createdAt,
        totalAmount: rajshree.amount * rajshree.qty
      }))
    });

  } catch (error) {
    console.error("List rajshree error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch rajshree bookings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}