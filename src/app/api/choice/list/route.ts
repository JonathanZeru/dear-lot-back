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

    const choices = await prisma.choiceBooking.findMany({
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
      choices: choices.map(choice => ({
        id: choice.id,
        numbers: choice.numbers,
        qty: choice.qty,
        amount: choice.amount,
        userId: choice.userId,
        sessionId: choice.sessionId,
        user: choice.user,
        createdAt: choice.createdAt,
        totalAmount: choice.amount * choice.qty
      }))
    });

  } catch (error) {
    console.error("List choices error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch choice bookings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}