import { z } from "zod";

export const createWalletTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive"),
    type: z.enum(["DEPOSIT", "REVENUE", "WITHDRAWAL"]),
    description: z.string().optional(),
    garageId: z.string().uuid("Invalid garage ID"),
  }),
});

export type CreateWalletTransactionInput = z.infer<typeof createWalletTransactionSchema>["body"];
