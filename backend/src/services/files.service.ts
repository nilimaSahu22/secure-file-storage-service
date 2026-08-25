import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { File, UploadStatus, Visibility } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler.middleware";
import {
  generatePresignedPost,
  generatePresignedGetUrl,
  headObject,
  deleteObject,
} from "./s3.service";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[/\\]/g, "_").replace(/[\x00-\x1f\x7f]/g, "").slice(-200) || "file";
}

export function buildStorageKey(userId: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  return `${userId}/${uuidv4()}-${safeName}`;
}

export async function createPendingFile(params: {
  ownerId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const storageKey = buildStorageKey(params.ownerId, params.originalName);

  const file = await prisma.file.create({
    data: {
      ownerId: params.ownerId,
      originalName: params.originalName,
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: BigInt(params.sizeBytes),
      status: UploadStatus.PENDING,
    },
  });

  const presignedPost = await generatePresignedPost(storageKey, params.mimeType);

  return { file, presignedPost };
}

export async function confirmUpload(fileId: string, ownerId: string) {
  const file = await prisma.file.findFirst({ where: { id: fileId, ownerId } });
  if (!file) {
    throw new HttpError(404, "NotFound");
  }

  if (file.status === UploadStatus.COMPLETED) {
    return file;
  }

  let head;
  try {
    head = await headObject(file.storageKey);
  } catch {
    await prisma.file.update({ where: { id: file.id }, data: { status: UploadStatus.FAILED } });
    throw new HttpError(400, "UploadNotFound");
  }

  if (head.ContentLength !== Number(file.sizeBytes)) {
    await prisma.file.update({ where: { id: file.id }, data: { status: UploadStatus.FAILED } });
    throw new HttpError(400, "UploadSizeMismatch");
  }

  return prisma.file.update({
    where: { id: file.id },
    data: { status: UploadStatus.COMPLETED },
  });
}

export function listUserFiles(ownerId: string): Promise<File[]> {
  return prisma.file.findMany({
    where: { ownerId, status: UploadStatus.COMPLETED },
    orderBy: { createdAt: "desc" },
  });
}

export function getFileById(fileId: string): Promise<File | null> {
  return prisma.file.findUnique({ where: { id: fileId } });
}

export async function getDownloadUrl(file: File): Promise<string> {
  try {
    await headObject(file.storageKey);
  } catch {
    throw new HttpError(404, "FileObjectNotFound");
  }
  return generatePresignedGetUrl(file.storageKey);
}

export function setVisibility(fileId: string, visibility: Visibility): Promise<File> {
  const shareToken = visibility === Visibility.PUBLIC ? crypto.randomBytes(32).toString("hex") : null;

  return prisma.file.update({
    where: { id: fileId },
    data: { visibility, shareToken },
  });
}

export async function deleteFile(file: File): Promise<void> {
  try {
    await deleteObject(file.storageKey);
  } catch (err) {
    console.error(`Failed to delete S3 object for file ${file.id}:`, err);
    throw new HttpError(500, "StorageDeleteFailed");
  }

  try {
    await prisma.file.delete({ where: { id: file.id } });
  } catch (err) {
    console.error(
      `S3 object ${file.storageKey} deleted but DB row for file ${file.id} failed to delete:`,
      err
    );
    throw new HttpError(500, "PartialDeleteFailure");
  }
}

export async function getUserStorageStats(ownerId: string) {
  const result = await prisma.file.aggregate({
    where: { ownerId, status: UploadStatus.COMPLETED },
    _sum: { sizeBytes: true },
    _count: true,
  });

  return {
    usedBytes: Number(result._sum.sizeBytes ?? 0n),
    fileCount: result._count,
  };
}
