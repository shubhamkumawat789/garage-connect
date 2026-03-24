import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { CreateBookingInput, UpdateBookingStatusInput } from "../validators/booking.validator.js";

const getOwnerGarageId = async (userId: string): Promise<string | null> => {
  const garage = await prisma.garage.findFirst({
    where: { userId },
    select: { id: true }
  });
  return garage?.id || null;
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const data = req.body as CreateBookingInput;

    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      res.status(403).json({ success: false, message: "Only customers can create bookings" });
      return;
    }

    // 1. Vehicle ownership check
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, customerId: customer.id }
    });
    if (!vehicle) {
      res.status(403).json({ success: false, message: "Vehicle not found or does not belong to you" });
      return;
    }

    // 2. Service ownership check
    const services = await prisma.service.findMany({
      where: {
        id: { in: data.serviceIds },
        garageId: data.garageId
      }
    });

    if (services.length !== data.serviceIds.length) {
      res.status(400).json({ success: false, message: "One or more services are invalid or do not belong to the selected garage" });
      return;
    }

    // 3. Total amount calculation
    const totalAmount = services.reduce((sum: number, service: any) => sum + (service.basePrice || 0), 0);

    // Create booking and items in transaction
    const booking = await prisma.$transaction(async (tx: any) => {
      const newBooking = await tx.booking.create({
        data: {
          customerId: customer.id,
          garageId: data.garageId,
          vehicleId: data.vehicleId,
          totalAmount,
          scheduledDate: new Date(data.scheduledDate),
          customerIssue: data.customerIssue || null,
          notes: data.notes || null,
          pickupRequired: data.pickupRequired,
          pickupAddress: data.pickupAddress || null,
          items: {
            create: services.map((service: any) => ({
              serviceId: service.id,
              price: service.basePrice || 0
            }))
          }
        },
        include: {
          items: true
        }
      });
      return newBooking;
    });

    res.status(201).json({ success: true, booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create booking" });
  }
};

export const getCustomerBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const customer = await prisma.customer.findUnique({ where: { userId } });
    
    if (!customer) {
      res.status(403).json({ success: false, message: "Not authorized as customer" });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        garage: { select: { garageName: true, address: true } },
        vehicle: { select: { make: true, model: true, vehicleNumber: true } },
        items: { include: { service: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch bookings" });
  }
};

export const getGarageBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const garageId = await getOwnerGarageId(userId);

    if (!garageId) {
      res.status(403).json({ success: false, message: "No garage found for this owner" });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { garageId },
      include: {
        customer: { include: { user: { select: { fullName: true, email: true } } } },
        vehicle: { select: { make: true, model: true, vehicleNumber: true } },
        items: { include: { service: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch garage bookings" });
  }
};

export const getBookingDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const role = req.user?.role as string;
    const bookingId = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: { select: { fullName: true, email: true } } } },
        garage: { select: { id: true, userId: true, garageName: true, address: true, city: true } },
        vehicle: true,
        items: { include: { service: true } }
      }
    });

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    // Access control: only the customer who made it, or the garage owner who received it
    if (role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({ where: { userId } });
      if (!customer || booking.customerId !== customer.id) {
        res.status(403).json({ success: false, message: "Access denied to this booking" });
        return;
      }
    } else if (role === "GARAGE_OWNER") {
      if (booking.garage.userId !== userId) {
        res.status(403).json({ success: false, message: "Access denied to this booking" });
        return;
      }
    } else if (role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.status(200).json({ success: true, booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch booking details" });
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub as string;
    const bookingId = req.params.id as string;
    const { status } = req.body as UpdateBookingStatusInput;

    const garageId = await getOwnerGarageId(userId);
    if (!garageId) {
      res.status(403).json({ success: false, message: "No garage found for this owner" });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking || booking.garageId !== garageId) {
      res.status(404).json({ success: false, message: "Booking not found or access denied" });
      return;
    }

    const currentStatus = booking.status as string;

    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "DECLINED", "CANCELLED"],
      APPROVED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      DECLINED: [],
      COMPLETED: [],
      CANCELLED: []
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${currentStatus} to ${status}. Booking may be completed or declined.` 
      });
      return;
    }

    const updateData: any = { status };
    if (status === "APPROVED") updateData.approvedAt = new Date();
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData
    });

    res.status(200).json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update booking status" });
  }
};
