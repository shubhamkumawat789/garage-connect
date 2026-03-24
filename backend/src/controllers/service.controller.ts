import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { CreateServiceInput, UpdateServiceInput } from "../validators/service.validator.js";

// Helper to ensure owner only edits their own garages
const getOwnerGarageId = async (userId: string): Promise<string | null> => {
  const garage = await prisma.garage.findFirst({
    where: { userId },
    select: { id: true }
  });
  return garage?.id || null;
};

export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const data = req.body as CreateServiceInput;

    const garageId = await getOwnerGarageId(userId);
    if (!garageId) {
      res.status(403).json({ success: false, message: "No garage found for this owner" });
      return;
    }

    const service = await prisma.service.create({
      data: {
        garageId,
        name: data.name,
        description: data.description || null,
        pricingType: data.pricingType,
        basePrice: data.basePrice ?? null,
        vehicleTypes: data.vehicleTypes,
        partsAvailable: data.partsAvailable || null
      }
    });

    res.status(201).json({ success: true, service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create service" });
  }
};

export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const serviceId = req.params.id as string;
    const data = req.body as UpdateServiceInput;

    const garageId = await getOwnerGarageId(userId);
    
    // Ensure service exists and belongs to owner's garage
    const existingService = await prisma.service.findFirst({
      where: { id: serviceId, garageId: garageId || "" }
    });

    if (!existingService) {
      res.status(404).json({ success: false, message: "Service not found or unauthorized" });
      return;
    }

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.pricingType && { pricingType: data.pricingType }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.vehicleTypes && { vehicleTypes: data.vehicleTypes }),
        ...(data.partsAvailable !== undefined && { partsAvailable: data.partsAvailable })
      }
    });

    res.status(200).json({ success: true, service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update service" });
  }
};

export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const serviceId = req.params.id as string;

    const garageId = await getOwnerGarageId(userId);
    
    const existingService = await prisma.service.findFirst({
      where: { id: serviceId, garageId: garageId || "" }
    });

    if (!existingService) {
      res.status(404).json({ success: false, message: "Service not found or unauthorized" });
      return;
    }

    await prisma.service.delete({ where: { id: serviceId } });

    res.status(200).json({ success: true, message: "Service deleted successfully" });
  } catch (error: any) {
    // If a service is linked to a booking item, prisma will throw a foreign key error. Handle graciously later or cascade.
    res.status(500).json({ success: false, message: error.message || "Failed to delete service. Ensure it's not locked in past bookings." });
  }
};

export const getGarageServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const garageId = req.params.id as string;
    
    const services = await prisma.service.findMany({
      where: { garageId }
    });

    res.status(200).json({ success: true, services });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch services" });
  }
};
