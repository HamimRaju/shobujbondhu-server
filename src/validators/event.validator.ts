import { z } from "zod";
import { EVENT_CATEGORIES } from "../constants/event-categories";
import { objectIdSchema } from "./common";

const BANGLADESH_OFFSET = "+06:00";

function todayInBangladesh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function startsAt(eventDate: string, eventTime: string) {
  return new Date(`${eventDate}T${eventTime}:00${BANGLADESH_OFFSET}`);
}

const eventFields = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: z.string().trim().min(1, "Description is required.").max(5000),
  category: z.enum(EVENT_CATEGORIES),
  imageUrl: z
    .string()
    .trim()
    .max(2048)
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
    .refine(
      (value) => value > todayInBangladesh(),
      "Choose an event date in the future.",
    ),
  eventTime: z.iso.time({ precision: -1 }),
});

export const createEventSchema = eventFields.superRefine((value, context) => {
  if (startsAt(value.eventDate, value.eventTime).getTime() <= Date.now()) {
    context.addIssue({
      code: "custom",
      path: ["eventTime"],
      message: "Event date and time must be in the future.",
    });
  }
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = eventFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one event field must be provided.",
  })
  .superRefine((value, context) => {
    if (value.eventDate && value.eventTime) {
      if (startsAt(value.eventDate, value.eventTime).getTime() <= Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["eventTime"],
          message: "Event date and time must be in the future.",
        });
      }
    } else if (
      value.eventDate &&
      value.eventDate <= todayInBangladesh()
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventDate"],
        message: "Choose an event date in the future.",
      });
    }
  });

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventIdParamsSchema = z.object({
  id: objectIdSchema,
});
