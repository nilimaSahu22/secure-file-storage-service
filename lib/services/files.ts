import { randomUUID } from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Department, MedicalFile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getS3Env } from "@/lib/env";

export { FileAccessDeniedError, assertDepartmentAccess, filterFilesForStaff, type StaffAccessor } from "@/lib/services/fileAccess";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

let cachedClient: S3Client | null = null;
function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const env = getS3Env();
  cachedClient = new S3Client({
    region: env.AWS_REGION,
    credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
  });
  return cachedClient;
}

export interface PresignInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignResult {
  url: string;
  fields: Record<string, string>;
  storageKey: string;
}

export async function presignUpload({ fileName, mimeType, sizeBytes }: PresignInput): Promise<PresignResult> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Unsupported file type.");
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size out of allowed range.");
  }

  const env = getS3Env();
  const client = getS3Client();
  const safeName = fileName.replace(/[^\w.-]/g, "_");
  const storageKey = `medical-files/${randomUUID()}-${safeName}`;

  const { url, fields } = await createPresignedPost(client, {
    Bucket: env.AWS_S3_BUCKET,
    Key: storageKey,
    Conditions: [
      ["content-length-range", 1, MAX_FILE_SIZE_BYTES],
      ["eq", "$Content-Type", mimeType],
    ],
    Fields: {
      "Content-Type": mimeType,
      "x-amz-server-side-encryption": "AES256",
    },
    Expires: 300,
  });

  return { url, fields, storageKey };
}

export interface ConfirmUploadInput {
  patientId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  department?: Department | null;
  uploadedByStaffId?: string;
  uploadedByPatient: boolean;
}

export async function confirmUpload(input: ConfirmUploadInput): Promise<MedicalFile> {
  const { patientId, storageKey, fileName, mimeType, sizeBytes, category, department, uploadedByStaffId, uploadedByPatient } =
    input;

  const previous = await prisma.medicalFile.findFirst({
    where: { patientId, category },
    orderBy: { version: "desc" },
  });

  let extractedText: string | null = null;
  if (mimeType === "application/pdf") {
    extractedText = await extractPdfText(storageKey).catch((err) => {
      console.error("PDF text extraction failed:", err);
      return null;
    });
  }

  return prisma.medicalFile.create({
    data: {
      patientId,
      uploadedByStaffId,
      uploadedByPatient,
      fileName,
      storageKey,
      mimeType,
      sizeBytes,
      category,
      department: department ?? null,
      version: previous ? previous.version + 1 : 1,
      previousVersionId: previous?.id,
      extractedText,
    },
  });
}

async function extractPdfText(storageKey: string): Promise<string | null> {
  const env = getS3Env();
  const client = getS3Client();
  const response = await client.send(new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: storageKey }));
  if (!response.Body) return null;

  const bytes = await response.Body.transformToByteArray();
  // Imported lazily: pdf-parse/pdfjs-dist reference browser globals that break
  // module evaluation in serverless runtimes, so only the PDF path pays that cost.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  try {
    const result = await parser.getText();
    return result.text || null;
  } finally {
    await parser.destroy();
  }
}

export function listPatientFiles(patientId: string) {
  return prisma.medicalFile.findMany({
    where: { patientId },
    orderBy: [{ category: "asc" }, { version: "desc" }],
  });
}

export async function getDownloadUrl(storageKey: string): Promise<string> {
  const env = getS3Env();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: 300 });
}
