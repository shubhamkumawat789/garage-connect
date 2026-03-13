import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { RegisterCustomerInput, RegisterOwnerInput, LoginInput } from "../validators/auth.validator.js";

export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as RegisterCustomerInput;
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(400).json({ success: false, message: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          fullName: data.fullName,
          role: "CUSTOMER",
          customer: {
            create: {
              ...(data.vehicle && {
                vehicles: {
                  create: {
                    make: data.vehicle.make,
                    model: data.vehicle.model,
                    year: data.vehicle.year,
                    vehicleNumber: data.vehicle.vehicleNumber,
                    vehicleType: data.vehicle.vehicleType,
                  },
                },
              }),
            },
          },
        },
        include: { customer: true },
      });
      return newUser;
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
};

export const registerOwner = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as RegisterOwnerInput;
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(400).json({ success: false, message: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          fullName: data.fullName,
          role: "GARAGE_OWNER",
          garages: {
            create: {
              garageName: data.garage.garageName,
              address: data.garage.address,
              city: data.garage.city,
              state: data.garage.state,
              pincode: data.garage.pincode,
              contactNo: data.garage.contactNo,
              description: data.garage.description,
            },
          },
        },
      });
      return newUser;
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Registration failed" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as LoginInput;
    const normalizedEmail = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Could not fetch user" });
  }
};
