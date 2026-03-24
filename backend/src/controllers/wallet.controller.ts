import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { CreateWalletTransactionInput } from "../validators/wallet.validator.js";

export const createWalletTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateWalletTransactionInput;
    const userId = req.user?.sub;

    const garage = await prisma.garage.findUnique({
      where: { id: data.garageId },
    });

    if (!garage) {
      res.status(404).json({ success: false, message: "Garage not found" });
      return;
    }

    // Authorization check: Only the owner or admin can add transactions
    if (garage.userId !== userId && req.user?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Not authorized to add transactions to this garage" });
      return;
    }

    const transaction = await prisma.$transaction(async (tx: any) => {
      // 1. Create transaction
      const newTransaction = await tx.walletTransaction.create({
        data: {
          amount: data.amount,
          type: data.type,
          description: data.description,
          garageId: data.garageId,
        },
      });

      // 2. Update garage balance
      let newBalance = garage.balance;
      if (data.type === "DEPOSIT" || data.type === "REVENUE") {
        newBalance += data.amount;
      } else if (data.type === "WITHDRAWAL") {
        newBalance -= data.amount;
      }

      await tx.garage.update({
        where: { id: data.garageId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Transaction creation failed" });
  }
};

export const getGarageTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { garageId } = req.params;
    const userId = req.user?.sub;

    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
    });

    if (!garage) {
      res.status(404).json({ success: false, message: "Garage not found" });
      return;
    }

    // Authorization check
    if (garage.userId !== userId && req.user?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Not authorized to view transactions for this garage" });
      return;
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { garageId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, transactions, balance: garage.balance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Could not fetch transactions" });
  }
};
