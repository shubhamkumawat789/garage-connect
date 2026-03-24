import { z } from "zod";

export const createFeedbackSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    message: z.string().min(5, "Message must be at least 5 characters long"),
  }),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>["body"];
