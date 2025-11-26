import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { hashPIN } from "../../../../../lib/utils";

function generateReferral() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const { userId, pin, name, role = "USER", referralCode } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    const pinHash = await hashPIN(pin);
if(referralCode == null) {
  const newUser = await prisma.user.create({
      data: {
        userId,
        pinHash,
        name,
        role
      },
    });
       return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: `${role.toLowerCase()} created successfully`,
 
    });
}
    let parentReferral = null;
    let parentUser = null;

    // If referral code is provided, validate it and get parent user
    if (referralCode) {
      parentUser = await prisma.user.findUnique({
        where: { referralCode },
      });

      if (!parentUser) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 400 }
        );
      }

      parentReferral = parentUser.referralCode;
    }

    // Validate role hierarchy based on referral code
    if (role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot create admin through this endpoint" },
        { status: 403 }
      );
    }

    if (role === "DISTRIBUTOR") {
      // Only allow distributor creation if referred by admin
      if (!parentUser || parentUser.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Distributors must be referred by an admin" },
          { status: 403 }
        );
      }
    }

    if (role === "AGENT") {
      // Only allow agent creation if referred by distributor
      if (!parentUser || parentUser.role !== "DISTRIBUTOR") {
        return NextResponse.json(
          { error: "Agents must be referred by a distributor" },
          { status: 403 }
        );
      }
    }

    if (role === "USER") {
      // Only allow customer creation if referred by agent
      if (!parentUser || parentUser.role !== "AGENT") {
        return NextResponse.json(
          { error: "Customers must be referred by an agent" },
          { status: 403 }
        );
      }
    }

    // Check if user ID already exists
    const existingUser = await prisma.user.findUnique({
      where: { userId }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User ID already exists" },
        { status: 400 }
      );
    }

    // Create new user with referral hierarchy
    const newUser = await prisma.user.create({
      data: {
        userId,
        pinHash,
        name,
        role,
        referralCode: generateReferral(),
        referredBy: parentReferral,
      },
      include: {
        parent: {
          select: {
            userId: true,
            name: true,
            role: true,
            referralCode: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: `${role.toLowerCase()} created successfully`,
      referredBy: newUser.parent ? {
        userId: newUser.parent.userId,
        name: newUser.parent.name,
        role: newUser.parent.role
      } : null
    });

  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}