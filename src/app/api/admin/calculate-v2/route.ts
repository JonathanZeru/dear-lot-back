import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();

  try {
    console.log("=== 🎯 CALCULATE-V2 STARTING ===");
    
    const results = await prisma.lotteryResult.findMany({
      where: { sessionId }
    });

    const firstPrize = results.find((r: { category: string; }) => r.category === "1st")?.number;
    const secondPrize = results.find((r: { category: string; }) => r.category === "2nd")?.number;
    const thirdPrize = results.find((r: { category: string; }) => r.category === "3rd")?.number;

    console.log("🏆 PRIZES:", { firstPrize, secondPrize, thirdPrize });

    if (!firstPrize) {
      return NextResponse.json({ error: "No 1st prize found" }, { status: 400 });
    }

    // Reset ALL bookings to PENDING
    console.log("🔄 Resetting all bookings...");
    await Promise.all([
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

    // Process each type
    const singleResults = await processSinglesV2(sessionId, firstPrize);
    const rajshreeResults = await processRajshreeV2(sessionId, firstPrize, secondPrize, thirdPrize);
    const choiceResults = await processChoiceV2(sessionId, firstPrize, secondPrize, thirdPrize);

    console.log("=== ✅ CALCULATE-V2 COMPLETE ===");

    return NextResponse.json({
      success: true,
      message: "V2 Winnings calculated successfully",
      summary: {
        firstPrizeNumber: firstPrize,
        secondPrizeNumber: secondPrize,
        thirdPrizeNumber: thirdPrize,
        singleBookings: singleResults,
        rajshreeBookings: rajshreeResults,
        choiceBookings: choiceResults
      }
    });

  } catch (error) {
    console.error("Calculate-v2 error:", error);
    return NextResponse.json({ error: "Failed to calculate winnings" }, { status: 500 });
  }
}

async function processSinglesV2(sessionId: string, firstPrize: number) {
  const singles = await prisma.singleBooking.findMany({
    where: { sessionId }
  });

  console.log(`📊 SINGLES: ${singles.length} bookings`);

  let winners = 0;
  let totalWinnings = 0;

  for (const booking of singles) {
    console.log(`🔍 Single ${booking.number} vs ${firstPrize}`);
    
    if (booking.number === firstPrize) {
      const winAmount = booking.amount * booking.qty * 90;
      winners++;
      totalWinnings += winAmount;

      await prisma.user.update({
        where: { id: booking.userId },
        data: { balance: { increment: winAmount } }
      });

      await prisma.singleBooking.update({
        where: { id: booking.id },
        data: { status: "WIN" }
      });
      
      console.log(`💰 Single WIN: ${winAmount}`);
    } else {
      await prisma.singleBooking.update({
        where: { id: booking.id },
        data: { status: "LOSE" }
      });
    }
  }

  return { processed: singles.length, winners, totalWinnings };
}

async function processRajshreeV2(sessionId: string, firstPrize: number | undefined, secondPrize: number | undefined, thirdPrize: number | undefined) {
  const rajshrees = await prisma.rajshreeBooking.findMany({
    where: { sessionId }
  });

  console.log(`📊 RAJSHREE: ${rajshrees.length} bookings`);

  let winners = 0;
  let totalWinnings = 0;
  const winTypes = { "CONSOLATION": 0 };

  for (const booking of rajshrees) {
    const bookingLastTwo = booking.number;
    const firstLastTwo = firstPrize ? firstPrize % 100 : 0;
    const secondLastTwo = secondPrize ? secondPrize % 100 : 0;
    const thirdLastTwo = thirdPrize ? thirdPrize % 100 : 0;

    console.log(`🔢 Rajshree ${booking.series}${booking.number} → Last2: ${bookingLastTwo}`);
    console.log(`🎯 Prize Last2: ${firstLastTwo}, ${secondLastTwo}, ${thirdLastTwo}`);

    let winAmount = 0;
    let winType = "LOSE";

    if (bookingLastTwo === firstLastTwo) {
      winAmount = booking.amount * booking.qty * 9;
      winType = "CONSOLATION";
      winTypes.CONSOLATION++;
      console.log(`🎖️ Rajshree WIN! Matched 1st prize last digits`);
    } else if (secondPrize && bookingLastTwo === secondLastTwo) {
      winAmount = booking.amount * booking.qty * 9;
      winType = "CONSOLATION";
      winTypes.CONSOLATION++;
      console.log(`🎖️ Rajshree WIN! Matched 2nd prize last digits`);
    } else if (thirdPrize && bookingLastTwo === thirdLastTwo) {
      winAmount = booking.amount * booking.qty * 9;
      winType = "CONSOLATION";
      winTypes.CONSOLATION++;
      console.log(`🎖️ Rajshree WIN! Matched 3rd prize last digits`);
    } else {
      console.log(`❌ Rajshree LOSE: No match`);
    }

    if (winAmount > 0) {
      winners++;
      totalWinnings += winAmount;

      await prisma.user.update({
        where: { id: booking.userId },
        data: { balance: { increment: winAmount } }
      });

      await prisma.rajshreeBooking.update({
        where: { id: booking.id },
        data: { status: winType }
      });
    } else {
      await prisma.rajshreeBooking.update({
        where: { id: booking.id },
        data: { status: "LOSE" }
      });
    }
  }

  return { processed: rajshrees.length, winners, totalWinnings, winTypes };
}

async function processChoiceV2(sessionId: string, firstPrize: number | undefined, secondPrize: number | undefined, thirdPrize: number | undefined) {
  const choices = await prisma.choiceBooking.findMany({
    where: { sessionId }
  });

  console.log(`📊 CHOICE: ${choices.length} bookings`);

  let winners = 0;
  let totalWinnings = 0;
  const winTypes = { "WIN_1": 0, "WIN_2": 0, "WIN_3": 0 };

  for (const booking of choices) {
    console.log(`🔍 Choice: "${booking.numbers}"`);
    
    // SAFE parsing - only numbers
    const numbers = booking.numbers.split(',')
      .map((num: string) => parseInt(num.trim()))
      .filter((num: number) => !isNaN(num) && num > 0 && num < 1000);

    console.log(`🔢 Parsed: [${numbers.join(', ')}]`);

    let matchedNumbers: number[] = [];

    if (firstPrize && numbers.includes(firstPrize)) {
      matchedNumbers.push(firstPrize);
    }
    if (secondPrize && numbers.includes(secondPrize)) {
      matchedNumbers.push(secondPrize);
    }
    if (thirdPrize && numbers.includes(thirdPrize)) {
      matchedNumbers.push(thirdPrize);
    }

    console.log(`📈 Matched: [${matchedNumbers.join(', ')}] → ${matchedNumbers.length} matches`);

    let winAmount = 0;
    let winType = "LOSE";

    if (matchedNumbers.length > 0 && matchedNumbers.length <= 3) {
      winAmount = booking.amount * booking.qty * matchedNumbers.length * 9;
      winType = `WIN_${matchedNumbers.length}`;
      winTypes[`WIN_${matchedNumbers.length}` as keyof typeof winTypes]++;
      console.log(`💰 Choice WIN_${matchedNumbers.length}: ${winAmount}`);
    } else if (matchedNumbers.length > 3) {
      console.log(`⚠️ Too many matches: ${matchedNumbers.length}, limiting to 3`);
      winAmount = booking.amount * booking.qty * 3 * 9;
      winType = "WIN_3";
      winTypes.WIN_3++;
    }

    if (winAmount > 0) {
      winners++;
      totalWinnings += winAmount;

      await prisma.user.update({
        where: { id: booking.userId },
        data: { balance: { increment: winAmount } }
      });

      await prisma.choiceBooking.update({
        where: { id: booking.id },
        data: { status: winType }
      });
    } else {
      await prisma.choiceBooking.update({
        where: { id: booking.id },
        data: { status: "LOSE" }
      });
    }
  }

  return { processed: choices.length, winners, totalWinnings, winTypes };
}