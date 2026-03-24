import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { UpdateCustomerProfileInput, UpdateGarageProfileInput } from "../validators/user.validator.js";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const role = req.user?.role;
    
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    let profileData: any = null;

    if (role === "CUSTOMER") {
      profileData = await prisma.customer.findUnique({
        where: { userId },
        include: { user: { select: { fullName: true, email: true } }, vehicles: true },
      });
    } else if (role === "GARAGE_OWNER") {
      profileData = await prisma.garage.findFirst({
        where: { userId },
        include: { user: { select: { fullName: true, email: true } } },
      });
    }

    if (!profileData) {
      res.status(404).json({ success: false, message: "Profile not found" });
      return;
    }

    res.status(200).json({ success: true, profile: profileData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch profile" });
  }
};

export const updateCustomerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const data = req.body as UpdateCustomerProfileInput;

    const user = await prisma.user.update({
      where: { id: userId! },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
      },
      select: { id: true, fullName: true, email: true },
    });

    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Update failed" });
  }
};

export const updateGarageProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const data = req.body as UpdateGarageProfileInput;

    const updatedUser = await prisma.$transaction(async (tx: any) => {
      if (data.fullName) {
        await tx.user.update({
          where: { id: userId! },
          data: { fullName: data.fullName },
        });
      }

      let updatedGarage = null;
      if (data.garage) {
        // Find existing garage for the owner. Assuming owners only have 1 active editable profile for now.
        const existingGarage = await tx.garage.findFirst({ where: { userId: userId! } });
        if (existingGarage) {
          updatedGarage = await tx.garage.update({
            where: { id: existingGarage.id },
            data: {
              ...(data.garage.garageName && { garageName: data.garage.garageName }),
              ...(data.garage.address && { address: data.garage.address }),
              ...(data.garage.city && { city: data.garage.city }),
              ...(data.garage.state && { state: data.garage.state }),
              ...(data.garage.pincode && { pincode: data.garage.pincode }),
              ...(data.garage.contactNo && { contactNo: data.garage.contactNo }),
              ...(data.garage.description && { description: data.garage.description }),
              ...(data.garage.openingHours && { openingHours: data.garage.openingHours }),
            },
          });
        }
      }

      return {
        user: await tx.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } }),
        garage: updatedGarage,
      };
    });

    res.status(200).json({ success: true, profile: updatedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Update failed" });
  }
};

export const addVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const data = req.body;

    const customer = await prisma.customer.findUnique({ where: { userId: userId! } });
    if (!customer) {
      res.status(404).json({ success: false, message: "Customer profile not found" });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...data,
        customerId: customer.id,
      },
    });

    res.status(201).json({ success: true, vehicle });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to add vehicle" });
  }
};
