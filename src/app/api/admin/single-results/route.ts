import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sessionId, results } = await req.json();

    if (!sessionId || !results || !Array.isArray(results)) {
      return NextResponse.json({ error: "Session ID and results array are required" }, { status: 400 });
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Create lottery results
    const createdResults = await prisma.$transaction(
      results.map((result: { category: string; number: number }) =>
        prisma.lotteryResult.create({
          data: {
            sessionId,
            category: result.category,
            number: result.number
          }
        })
      )
    );

    // Calculate winnings for single bookings
    const singleBookings = await prisma.singleBooking.findMany({
      where: { sessionId },
      include: { user: true }
    });

    let totalWinnings = 0;
    const winningUpdates = [];
    let winnersCount = 0;

    for (const booking of singleBookings) {
      const result = results.find((r: { category: string; number: number }) => 
        r.category === booking.category && r.number === booking.number
      );

      if (result) {
        winnersCount++;
        // Single lottery typically pays 9x the bet amount
        const winAmount = booking.amount * 9;
        totalWinnings += winAmount;

        // Update booking status and win amount
        winningUpdates.push(
          prisma.singleBooking.update({
            where: { id: booking.id },
            data: {
              status: "WON",
              winAmount: winAmount
            }
          })
        );

        // Update user balance
        winningUpdates.push(
          prisma.user.update({
            where: { id: booking.userId },
            data: {
              balance: { increment: winAmount }
            }
          })
        );

        // Create winning transaction
        winningUpdates.push(
          prisma.transaction.create({
            data: {
              userId: booking.userId,
              amount: winAmount,
              type: "WINNING"
            }
          })
        );
      } else {
        // Mark as lost
        winningUpdates.push(
          prisma.singleBooking.update({
            where: { id: booking.id },
            data: { status: "LOST" }
          })
        );
      }
    }

    // Execute all updates
    if (winningUpdates.length > 0) {
      await prisma.$transaction(winningUpdates);
    }

    return NextResponse.json({
      success: true,
      message: `Single results declared successfully. ${winnersCount} winners found.`,
      totalWinnings,
      results: createdResults
    });

  } catch (error) {
    console.error("Declare single results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}