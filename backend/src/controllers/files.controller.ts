import { Request, Response } from "express";
import { File, Visibility } from "@prisma/client";
import {
  createPendingFile,
  confirmUpload,
  listUserFiles,
  getDownloadUrl,
  setVisibility,
  deleteFile,
  getUserStorageStats,
} from "../services/files.service";

function serializeFile(file: File) {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    visibility: file.visibility,
    shareToken: file.shareToken,
    status: file.status,
    viewCount: file.viewCount,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export async function createFile(req: Request, res: Response) {
  const { originalName, mimeType, sizeBytes } = req.body;
  const { file, presignedPost } = await createPendingFile({
    ownerId: req.userId!,
    originalName,
    mimeType,
    sizeBytes,
  });

  res.status(201).json({
    fileId: file.id,
    uploadUrl: presignedPost.url,
    uploadFields: presignedPost.fields,
  });
}

export async function confirmFileUpload(req: Request, res: Response) {
  const file = await confirmUpload(String(req.params.id), req.userId!);
  res.status(200).json({ file: serializeFile(file) });
}

export async function listFiles(req: Request, res: Response) {
  const files = await listUserFiles(req.userId!);
  res.status(200).json({ files: files.map(serializeFile) });
}

export async function getFile(req: Request, res: Response) {
  res.status(200).json({ file: serializeFile(req.file!) });
}

export async function downloadFile(req: Request, res: Response) {
  const url = await getDownloadUrl(req.file!);
  res.status(200).json({ url });
}

export async function updateVisibility(req: Request, res: Response) {
  const { visibility } = req.body as { visibility: Visibility };
  const file = await setVisibility(req.file!.id, visibility);
  res.status(200).json({ file: serializeFile(file) });
}

export async function removeFile(req: Request, res: Response) {
  await deleteFile(req.file!);
  res.status(204).send();
}

export async function getStats(req: Request, res: Response) {
  const stats = await getUserStorageStats(req.userId!);
  res.status(200).json(stats);
}
