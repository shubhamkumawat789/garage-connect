import { Router } from "express";
import { createEmergencyRequest, updateEmergencyStatus, getAllEmergencyRequests } from "../controllers/emergency.controller.js";
import { validateRequest } from "../middleware/validate.js";
import { createEmergencyRequestSchema } from "../validators/emergency.validator.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, authorize(["CUSTOMER"]), validateRequest(createEmergencyRequestSchema), createEmergencyRequest);
router.put("/:requestId", authenticate, authorize(["ADMIN", "GARAGE_OWNER"]), updateEmergencyStatus);
router.get("/", authenticate, authorize(["ADMIN", "GARAGE_OWNER"]), getAllEmergencyRequests);

export default router;
