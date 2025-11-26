import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

  try {
    // Reset all bookings to PENDING status
    const [singleResult, rajshreeResult, choiceResult] = await Promise.all([
      prisma.singleBooking.updateMany({
        where: { sessionId },
        data: { status: "PENDING" }
      }),
      prisma.rajshreeBooking.updateMany({
        where: { sessionId },
        data: { status: "PENDING" }
      }),
      prisma.choiceBooking.updateMany({
        where: { sessionId },
        data: { status: "PENDING" }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "All bookings reset to PENDING status",
      resetCount: {
        singles: singleResult.count,
        rajshrees: rajshreeResult.count,
        choices: choiceResult.count
      }
    });

  } catch (error) {
    console.error("Reset bookings error:", error);
    return NextResponse.json({ error: "Failed to reset bookings" }, { status: 500 });
  }
}