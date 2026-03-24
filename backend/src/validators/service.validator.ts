import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  description: z.string().optional(),
  pricingType: z.enum(["FIXED", "INSPECTION_BASED", "PARTS_DEPENDENT"]).default("FIXED"),
  basePrice: z.number().min(0, "Price cannot be negative").optional(),
  vehicleTypes: z.array(z.enum(["TWO_WHEELER", "FOUR_WHEELER"])).nonempty("At least one vehicle type must be selected"),
  partsAvailable: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
