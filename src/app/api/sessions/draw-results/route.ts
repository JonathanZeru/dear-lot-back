import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { calculateWinnings } from "../../../../../lib/winning";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

  try {
    console.log("🎲 Starting automatic draw for session:", sessionId);

    // Generate random winning numbers (000-999)
    const firstPrize = Math.floor(Math.random() * 1000);
    const secondPrize = Math.floor(Math.random() * 1000);
    const thirdPrize = Math.floor(Math.random() * 1000);

    console.log("🏆 Generated prizes:", { firstPrize, secondPrize, thirdPrize });

    // Delete any existing results for this session (prevent duplicates)
    await prisma.lotteryResult.deleteMany({
      where: { sessionId }
    });

    // Save new results to database
    const results = await Promise.all([
      prisma.lotteryResult.create({
        data: { sessionId, category: "1st", number: firstPrize }
      }),
      prisma.lotteryResult.create({
        data: { sessionId, category: "2nd", number: secondPrize }
      }),
      prisma.lotteryResult.create({
        data: { sessionId, category: "3rd", number: thirdPrize }
      })
    ]);

    console.log("✅ Results saved to database");

    // Calculate winnings automatically using our working V2 logic
    await calculateWinnings(sessionId);
    console.log("✅ Winnings calculated");

    // Close the session (mark as inactive - no more bets)
    await prisma.session.update({
      where: { id: sessionId },
      data: { active: false }
    });

    console.log("✅ Session closed");

    return NextResponse.json({
      success: true,
      message: "Draw completed successfully!",
      drawResults: {
        firstPrize: firstPrize.toString().padStart(3, '0'),
        secondPrize: secondPrize.toString().padStart(3, '0'),
        thirdPrize: thirdPrize.toString().padStart(3, '0')
      },
      sessionClosed: true,
      summary: "Winnings have been automatically distributed to all winners"
    });

  } catch (error) {
    console.error("Draw error:", error);
    return NextResponse.json({ 
      error: "Failed to conduct draw",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}