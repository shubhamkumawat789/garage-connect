import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { CreateEmergencyRequestInput } from "../validators/emergency.validator.js";

export const createEmergencyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateEmergencyRequestInput;
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: "Customer profile not found" });
      return;
    }

    const emergencyRequest = await (prisma as any).emergencyRequest.create({
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        customerId: customer.id,
      },
    });

    res.status(201).json({ success: true, emergencyRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Emergency request creation failed" });
  }
};

export const updateEmergencyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const updatedRequest = await (prisma as any).emergencyRequest.update({
      where: { id: String(requestId) },
      data: { status: String(status) },
    });

    res.status(200).json({ success: true, emergencyRequest: updatedRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Emergency status update failed" });
  }
};

export const getAllEmergencyRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await (prisma as any).emergencyRequest.findMany({
      include: {
        customer: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Could not fetch emergency requests" });
  }
};
