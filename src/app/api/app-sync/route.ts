import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { hashPIN } from "../../../../lib/utils";

const JWT_SECRET_KEY =
  "6a01c3cd5ba8eedf5b64c90c3fb427da41485fe3d7af638383f0521323241555eab35552e989d181c8d7199cf1e1bccf298d1a122d810215441f4b550d7f69d3";

function generateReferral() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const { userId, name, pin, role = "USER", referralCode } = await req.json();
    console.log({ userId, name, pin, role, referralCode });

    if (!userId || !name || !pin) {
      return NextResponse.json(
        { error: "userId, name, and pin are required" },
        { status: 400 }
      );
    }

    // Check if user already exists in Next.js DB
    let user = await prisma.user.findUnique({
      where: { userId },
    });

    // Create user if not found
    if (!user) {
      const pinHash = await hashPIN(pin);

      user = await prisma.user.create({
        data: {
          userId,
          name,
          pinHash,
          role,
          referralCode: referralCode ?? generateReferral(),
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.userId,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      success: true,
      message: "User synced successfully",
      user,
      token,
    });
  } catch (error) {
    console.error("app-sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
