import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { hashPIN } from "../../../../../lib/utils";

function generateReferral() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const { userId, pin, name } = await req.json();

    if (!userId || !pin || !name) {
      return NextResponse.json(
        { error: "User ID, PIN, and name are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userId },
          { referralCode: userId.toUpperCase() }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User ID already exists" },
        { status: 400 }
      );
    }

    const pinHash = await hashPIN(pin);

    // Create admin user (no parent referral)
    const adminUser = await prisma.user.create({
      data: {
        userId,
        pinHash,
        name,
        role: "ADMIN",
        referralCode: generateReferral(),
        // Admin has no referredBy
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: adminUser,
      message: "Admin created successfully" 
    });

  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}