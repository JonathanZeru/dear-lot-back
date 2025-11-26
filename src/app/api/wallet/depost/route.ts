import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { authUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const auth = await authUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount } = await req.json();

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  try {
    // Get current user with referral hierarchy
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.id },
      include: {
        parent: {
          include: {
            parent: true // Get distributor through agent
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if(currentUser.referralCode == null){
        const updatedUser = await prisma.user.update({
        where: { id: auth.id },
        data: {
          balance: { increment: amount },
        },
      });
       return NextResponse.json({
      message: "Deposit successful",
      balance: currentUser.balance,
    });
    }

    // Calculate commissions (2% each for agent and distributor)
    const agentCommission = amount * 0.02;
    const distributorCommission = amount * 0.02;
    const userNetAmount = amount - agentCommission - distributorCommission;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user balance with net amount
      const updatedUser = await tx.user.update({
        where: { id: auth.id },
        data: {
          balance: { increment: userNetAmount },
        },
      });

      // Create main deposit transaction
      await tx.transaction.create({
        data: {
          userId: auth.id,
          amount: userNetAmount,
          type: "DEPOSIT",
        },
      });

      let agentTransaction = null;
      let distributorTransaction = null;

      // Handle agent commission
      if (currentUser.parent) {
        const agent = currentUser.parent;
        await tx.user.update({
          where: { id: agent.id },
          data: {
            balance: { increment: agentCommission },
          },
        });

        agentTransaction = await tx.transaction.create({
          data: {
            userId: agent.id,
            amount: agentCommission,
            type: "COMMISSION",
            agentId: agent.id,
            distributorId: agent.parent ? agent.parent.id : null,
          },
        });
      }

      // Handle distributor commission
      if (currentUser.parent?.parent) {
        const distributor = currentUser.parent.parent;
        await tx.user.update({
          where: { id: distributor.id },
          data: {
            balance: { increment: distributorCommission },
          },
        });

        distributorTransaction = await tx.transaction.create({
          data: {
            userId: distributor.id,
            amount: distributorCommission,
            type: "COMMISSION",
            agentId: currentUser.parent.id,
            distributorId: distributor.id,
          },
        });
      }

      return {
        user: updatedUser,
        agentTransaction,
        distributorTransaction
      };
    });

    return NextResponse.json({
      message: "Deposit successful",
      balance: result.user.balance,
      commissions: {
        agent: result.agentTransaction ? agentCommission : 0,
        distributor: result.distributorTransaction ? distributorCommission : 0
      }
    });

  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}