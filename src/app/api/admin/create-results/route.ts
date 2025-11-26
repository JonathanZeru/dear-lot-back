import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, results } = await req.json();

    if (!sessionId || !results || !Array.isArray(results)) {
      return NextResponse.json({ error: "Session ID and results array are required" }, { status: 400 });
    }

    // Verify session exists and is active
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Create lottery results
    const createdResults = await prisma.lotteryResult.createMany({
      data: results.map(result => ({
        sessionId,
        category: result.category,
        number: result.number
      }))
    });

    // Calculate winnings for all bookings
    await calculateWinnings(sessionId);

    return NextResponse.json({
      success: true,
      message: "Results created and winnings calculated successfully",
      results: createdResults
    });

  } catch (error) {
    console.error("Create results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function calculateWinnings(sessionId: string) {
  // Get all results for this session
  const results = await prisma.lotteryResult.findMany({
    where: { sessionId }
  });

  // Prize multipliers based on category
  const prizeMultipliers = {
    '1st': 90,  // 90x for first prize
    '2nd': 60,  // 60x for second prize  
    '3rd': 40,  // 40x for third prize
    '4th': 20,  // 20x for fourth prize
    '5th': 10   // 10x for fifth prize
  };

  // Calculate single booking winnings
  const singleBookings = await prisma.singleBooking.findMany({
    where: { 
      sessionId,
      status: 'PENDING'
    },
    include: { user: true }
  });

  for (const booking of singleBookings) {
    const result = results.find(r => r.category === booking.category && r.number === booking.number);
    
    if (result) {
      const multiplier = prizeMultipliers[booking.category as keyof typeof prizeMultipliers] || 1;
      const winningAmount = booking.amount * multiplier;
      
      // Update user balance
      await prisma.user.update({
        where: { id: booking.userId },
        data: { balance: { increment: winningAmount } }
      });

      // Update booking status
      await prisma.singleBooking.update({
        where: { id: booking.id },
        data: { 
          status: 'WON',
          // Store winning amount for reference
        }
      });

      // Create winning transaction
      await prisma.transaction.create({
        data: {
          userId: booking.userId,
          amount: winningAmount,
          type: 'WINNING',
          createdAt: new Date()
        }
      });
    } else {
      // Mark as lost
      await prisma.singleBooking.update({
        where: { id: booking.id },
        data: { status: 'LOST' }
      });
    }
  }

  // Calculate rajshree booking winnings
  const rajshreeBookings = await prisma.rajshreeBooking.findMany({
    where: { 
      sessionId,
      status: 'PENDING'
    },
    include: { user: true }
  });

  for (const booking of rajshreeBookings) {
    const result = results.find(r => r.category === booking.category && r.number === booking.number);
    
    if (result) {
      const multiplier = prizeMultipliers[booking.category as keyof typeof prizeMultipliers] || 1;
      const winningAmount = booking.amount * multiplier;
      
      // Update user balance
      await prisma.user.update({
        where: { id: booking.userId },
        data: { balance: { increment: winningAmount } }
      });

      // Update booking status
      await prisma.rajshreeBooking.update({
        where: { id: booking.id },
        data: { status: 'WON' }
      });

      // Create winning transaction
      await prisma.transaction.create({
        data: {
          userId: booking.userId,
          amount: winningAmount,
          type: 'WINNING',
          createdAt: new Date()
        }
      });
    } else {
      // Mark as lost
      await prisma.rajshreeBooking.update({
        where: { id: booking.id },
        data: { status: 'LOST' }
      });
    }
  }
}