import { NextResponse } from "next/server";
import { authUser } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export async function GET(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const transactions = await prisma.transaction.findMany({
     
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            
          }
        },
        // Include agent details
        agent: {
          select: {
            id: true,
            userId: true,
            name: true,
            referralCode: true
          }
        },
        // Include distributor details  
        distributor: {
          select: {
            id: true,
            userId: true,
            name: true,
            referralCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Format the response with proper agent and distributor info
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      agent: transaction.agentId ? {
        id: transaction.agent?.id,
        userId: transaction.agent?.userId,
        name: transaction.agent?.name,
        referralCode: transaction.agent?.referralCode
      } : null,
      distributor: transaction.distributorId ? {
        id: transaction.distributor?.id,
        userId: transaction.distributor?.userId,
        name: transaction.distributor?.name,
        referralCode: transaction.distributor?.referralCode
      } : null,
      createdAt: transaction.createdAt,
      user: transaction.user
    }));

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}