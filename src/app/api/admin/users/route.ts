import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

// Get all users with hierarchy (filtered by current user's team)
export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.id }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let users = [];

    // Different data access based on role
    if (currentUser.role === "ADMIN") {
      // Admin can see all users
      users = await prisma.user.findMany({
        include: {
          parent: {
            select: {
              userId: true,
              name: true,
              referralCode: true,
              role: true
            }
          },
          children: {
            select: {
              userId: true,
              name: true,
              referralCode: true,
              role: true,
              balance: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              children: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Distributors and agents can only see their team
      users = await prisma.user.findMany({
        where: {
          OR: [
            { referredBy: currentUser.referralCode }, // Direct children
            { 
              parent: {
                referredBy: currentUser.referralCode // Grandchildren
              }
            }
          ]
        },
        include: {
          parent: {
            select: {
              userId: true,
              name: true,
              referralCode: true,
              role: true
            }
          },
          children: {
            select: {
              userId: true,
              name: true,
              referralCode: true,
              role: true,
              balance: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              children: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}