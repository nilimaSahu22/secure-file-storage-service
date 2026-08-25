import { Request, Response } from "express";
import { Visibility } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generatePresignedGetUrl } from "../services/s3.service";

export async function getSharedFile(req: Request, res: Response) {
  const { token } = req.params;

  const file = await prisma.file.findUnique({ where: { shareToken: String(token) } });

  if (!file || file.visibility !== Visibility.PUBLIC) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const updated = await prisma.file.update({
    where: { id: file.id },
    data: { viewCount: { increment: 1 } },
  });

  const url = await generatePresignedGetUrl(updated.storageKey);

  res.status(200).json({
    file: {
      originalName: updated.originalName,
      mimeType: updated.mimeType,
      sizeBytes: Number(updated.sizeBytes),
      viewCount: updated.viewCount,
    },
    url,
  });
}
