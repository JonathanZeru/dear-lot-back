import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth || auth.role !== "ADMIN") 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, drawTime } = await req.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Session name is required" }, { status: 400 });
    }

    if (!drawTime) {
      return NextResponse.json({ error: "Draw time is required" }, { status: 400 });
    }

    console.log("Creating session:", { name, drawTime });

    const session = await prisma.session.create({
      data: { 
        name: name.trim(), 
        drawTime: drawTime.trim()
      }
    });

    return NextResponse.json({ 
      success: true, 
      session: {
        id: session.id,
        name: session.name,
        drawTime: session.drawTime,
        active: session.active,
        date: session.date
      }
    });

  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ 
      error: "Failed to create session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}