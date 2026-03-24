import { Router } from "express";
import { createFeedback, getAllFeedbacks } from "../controllers/feedback.controller.js";
import { validateRequest } from "../middleware/validate.js";
import { createFeedbackSchema } from "../validators/feedback.validator.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/", validateRequest(createFeedbackSchema), createFeedback);
router.get("/", authenticate, authorize(["ADMIN"]), getAllFeedbacks);

export default router;
