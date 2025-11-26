import { NextResponse } from "next/server";
import { authUser } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, bookingType } = await req.json();

  try {
    let result;
    
    if (bookingType === "single") {
      result = await prisma.singleBooking.update({
        where: { id: bookingId },
        data: { status: "PENDING" }
      });
    } else if (bookingType === "rajshree") {
      result = await prisma.rajshreeBooking.update({
        where: { id: bookingId },
        data: { status: "PENDING" }
      });
    } else if (bookingType === "choice") {
      result = await prisma.choiceBooking.update({
        where: { id: bookingId },
        data: { status: "PENDING" }
      });
    } else {
      return NextResponse.json({ error: "Invalid booking type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Booking reset to PENDING",
      booking: result
    });

  } catch (error) {
    console.error("Reset booking error:", error);
    return NextResponse.json({ error: "Failed to reset booking" }, { status: 500 });
  }
}