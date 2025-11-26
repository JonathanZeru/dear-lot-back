// lib/winning.ts - Use the V2 logic that works
import prisma from "./prisma";

export async function calculateWinnings(sessionId: string) {
  console.log("=== 🎯 CALCULATE WINNINGS STARTED ===");
  
  const results = await prisma.lotteryResult.findMany({
    where: { sessionId }
  });

  const firstPrize = results.find(r => r.category === "1st")?.number;
  const secondPrize = results.find(r => r.category === "2nd")?.number;
  const thirdPrize = results.find(r => r.category === "3rd")?.number;

  console.log("🏆 PRIZES:", { firstPrize, secondPrize, thirdPrize });

  if (!firstPrize) {
    console.log("❌ No 1st prize found - stopping calculation");
    return;
  }

  // Process each type
  await processSingles(sessionId, firstPrize);
  await processRajshree(sessionId, firstPrize, secondPrize, thirdPrize);
  await processChoice(sessionId, firstPrize, secondPrize, thirdPrize);
  
  console.log("=== ✅ WINNING CALCULATION COMPLETE ===");
}

async function processSingles(sessionId: string, firstPrize: number) {
  const singles = await prisma.singleBooking.findMany({
    where: { sessionId, status: "PENDING" }
  });

  console.log(`📊 SINGLES: ${singles.length} bookings`);

  for (const booking of singles) {
    console.log(`🔍 Single ${booking.number} vs ${firstPrize}`);
    
    if (booking.number === firstPrize) {
      const winAmount = booking.amount * booking.qty * 90;

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
}

async function processRajshree(sessionId: string, firstPrize: number | undefined, secondPrize: number | undefined, thirdPrize: number | undefined) {
  const rajshrees = await prisma.rajshreeBooking.findMany({
    where: { sessionId, status: "PENDING" }
  });

  console.log(`📊 RAJSHREE: ${rajshrees.length} bookings`);

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
      console.log(`🎖️ Rajshree WIN! Matched 1st prize last digits`);
    } else if (secondPrize && bookingLastTwo === secondLastTwo) {
      winAmount = booking.amount * booking.qty * 9;
      winType = "CONSOLATION";
      console.log(`🎖️ Rajshree WIN! Matched 2nd prize last digits`);
    } else if (thirdPrize && bookingLastTwo === thirdLastTwo) {
      winAmount = booking.amount * booking.qty * 9;
      winType = "CONSOLATION";
      console.log(`🎖️ Rajshree WIN! Matched 3rd prize last digits`);
    } else {
      console.log(`❌ Rajshree LOSE: No match`);
    }

    if (winAmount > 0) {
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
}

async function processChoice(sessionId: string, firstPrize: number | undefined, secondPrize: number | undefined, thirdPrize: number | undefined) {
  const choices = await prisma.choiceBooking.findMany({
    where: { sessionId, status: "PENDING" }
  });

  console.log(`📊 CHOICE: ${choices.length} bookings`);

  for (const booking of choices) {
    console.log(`🔍 Choice: "${booking.numbers}"`);
    
    // SAFE parsing - only numbers
    const numbers = booking.numbers.split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num) && num > 0 && num < 1000);

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
      console.log(`💰 Choice WIN_${matchedNumbers.length}: ${winAmount}`);
    }

    if (winAmount > 0) {
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
}