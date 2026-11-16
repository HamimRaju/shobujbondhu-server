import { z } from "zod";

const profileImageUrlSchema = z
  .string()
  .trim()
  .url("Image must be a valid URL.")
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
  }, "Image must use HTTP or HTTPS.");

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty.").max(120).optional(),
    image: profileImageUrlSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field must be provided.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
