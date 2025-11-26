import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type'); // 'single' or 'rajshree'

    const whereClause: any = { userId: auth.id };
    if (sessionId) whereClause.sessionId = sessionId;

    // Get single bookings
    const singleBookings = await prisma.singleBooking.findMany({
      where: type === 'rajshree' ? { id: '' } : whereClause, // Empty if type is rajshree
      include: {
        session: {
          select: {
            name: true,
            drawTime: true,
            results: {
              where: { category: '1st' } // Assuming 1st is the main result
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get rajshree bookings
    const rajshreeBookings = await prisma.rajshreeBooking.findMany({
      where: type === 'single' ? { id: '' } : whereClause, // Empty if type is single
      include: {
        session: {
          select: {
            name: true,
            drawTime: true,
            results: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      singleBookings,
      rajshreeBookings
    });

  } catch (error) {
    console.error("Get user bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}