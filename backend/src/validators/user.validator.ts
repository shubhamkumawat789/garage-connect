import { z } from "zod";

export const updateCustomerProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required").optional(),
});

export const updateGarageProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required").optional(),
  garage: z.object({
    garageName: z.string().min(2, "Garage name is required").optional(),
    address: z.string().min(5, "Address must be at least 5 characters").optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    contactNo: z.string().optional(),
    description: z.string().optional(),
    openingHours: z.string().optional(),
  }).optional()
});

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type UpdateGarageProfileInput = z.infer<typeof updateGarageProfileSchema>;
