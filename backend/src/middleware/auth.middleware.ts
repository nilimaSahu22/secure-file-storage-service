import { NextFunction, Request, Response } from "express";
import { File } from "@prisma/client";
import { verifyAccessToken } from "../services/auth.service";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      file?: File;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function ownsFile(req: Request, res: Response, next: NextFunction) {
  const id = String(req.params.id);
  const file = await prisma.file.findUnique({ where: { id } });

  if (!file) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  if (file.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.file = file;
  next();
}
