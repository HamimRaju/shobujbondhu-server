import { z } from "zod";
import { EVENT_CATEGORIES } from "../constants/event-categories";
import { objectIdSchema } from "./common";

const todayUtc = () => new Date().toISOString().slice(0, 10);

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: z.string().trim().min(1, "Description is required.").max(5000),
  category: z.enum(EVENT_CATEGORIES),
  imageUrl: z
    .string()
    .trim()
    .url("Image URL must be a valid URL.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          Boolean(url.hostname) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "Image URL must use HTTP or HTTPS."),
  location: z.string().trim().min(1, "Location is required.").max(250),
  eventDate: z
    .iso
    .date()
    .refine((value) => value >= todayUtc(), "Event date cannot be in the past."),
  eventTime: z.iso.time({ precision: -1 }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one event field must be provided.",
  });

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventIdParamsSchema = z.object({
  id: objectIdSchema,
});
