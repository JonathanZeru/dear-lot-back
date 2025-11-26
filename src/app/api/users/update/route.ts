// users/update/route.ts
import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function PUT(req: Request) {
  try {
    const { id, name, role } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { name, role },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
