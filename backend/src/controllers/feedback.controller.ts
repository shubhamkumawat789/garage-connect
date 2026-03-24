import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { CreateFeedbackInput } from "../validators/feedback.validator.js";

export const createFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateFeedbackInput;
    const userId = req.user?.sub;

    const feedback = await prisma.feedback.create({
      data: {
        message: data.message,
        name: data.name,
        email: data.email,
        userId: userId || null,
      },
    });

    res.status(201).json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Feedback creation failed" });
  }
};

export const getAllFeedbacks = async (req: Request, res: Response): Promise<void> => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Could not fetch feedbacks" });
  }
};
