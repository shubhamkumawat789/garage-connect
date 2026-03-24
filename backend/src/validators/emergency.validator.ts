import { z } from "zod";

export const createEmergencyRequestSchema = z.object({
  body: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type CreateEmergencyRequestInput = z.infer<typeof createEmergencyRequestSchema>["body"];
