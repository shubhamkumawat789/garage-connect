import { Router } from "express";
import { createWalletTransaction, getGarageTransactions } from "../controllers/wallet.controller.js";
import { validateRequest } from "../middleware/validate.js";
import { createWalletTransactionSchema } from "../validators/wallet.validator.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, authorize(["GARAGE_OWNER", "ADMIN"]), validateRequest(createWalletTransactionSchema), createWalletTransaction);
router.get("/:garageId", authenticate, authorize(["GARAGE_OWNER", "ADMIN"]), getGarageTransactions);

export default router;
