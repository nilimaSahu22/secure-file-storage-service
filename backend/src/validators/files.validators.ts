import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "../services/s3.service";

export const createFileSchema = z.object({
  body: z.object({
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(255),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_UPLOAD_BYTES, "File exceeds the 500MB upload limit"),
  }),
});

export const visibilitySchema = z.object({
  body: z.object({
    visibility: z.enum(["PRIVATE", "PUBLIC"]),
  }),
});

export type CreateFileInput = z.infer<typeof createFileSchema>["body"];
export type VisibilityInput = z.infer<typeof visibilitySchema>["body"];
