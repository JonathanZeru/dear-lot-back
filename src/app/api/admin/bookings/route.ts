// app/api/admin/bookings/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category'); // 'single', 'rajshree', 'choice', or null for all
    const sessionId = searchParams.get('sessionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (sessionId) whereClause.sessionId = sessionId;

    let singleBookings: any[] = [];
    let rajshreeBookings: any[] = [];
    let choiceBookings: any[] = [];
    let totalCount = 0;

    // Fetch bookings based on category
    if (!category || category === 'single') {
      const singleData = await prisma.singleBooking.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          },
          session: {
            select: {
              name: true,
              drawTime: true,
              active: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: category ? 0 : skip, // Only paginate when fetching all categories
        take: category ? undefined : limit
      });
      singleBookings = singleData.map(booking => ({
        ...booking,
        type: 'single',
        category: booking.category
      }));
      if (category === 'single') totalCount += singleData.length;
    }

    if (!category || category === 'rajshree') {
      const rajshreeData = await prisma.rajshreeBooking.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          },
          session: {
            select: {
              name: true,
              drawTime: true,
              active: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: category ? 0 : skip,
        take: category ? undefined : limit
      });
      rajshreeBookings = rajshreeData.map(booking => ({
        ...booking,
        type: 'rajshree',
        category: 'rajshree'
      }));
      if (category === 'rajshree') totalCount += rajshreeData.length;
    }

    if (!category || category === 'choice') {
      const choiceData = await prisma.choiceBooking.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          },
          session: {
            select: {
              name: true,
              drawTime: true,
              active: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: category ? 0 : skip,
        take: category ? undefined : limit
      });
      choiceBookings = choiceData.map(booking => ({
        ...booking,
        type: 'choice',
        category: 'choice'
      }));
      if (category === 'choice') totalCount += choiceData.length;
    }

    // Combine all bookings
    const allBookings = [...singleBookings, ...rajshreeBookings, ...choiceBookings];
    
    // Sort by creation date
    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // If no specific category, get total count for pagination
    if (!category) {
      const singleCount = await prisma.singleBooking.count({ where: whereClause });
      const rajshreeCount = await prisma.rajshreeBooking.count({ where: whereClause });
      const choiceCount = await prisma.choiceBooking.count({ where: whereClause });
      totalCount = singleCount + rajshreeCount + choiceCount;
    }

    return NextResponse.json({
      success: true,
      bookings: category ? allBookings : allBookings.slice(0, limit),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      filters: {
        userId,
        category,
        sessionId
      }
    });

  } catch (error) {
    console.error("Get admin bookings error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}