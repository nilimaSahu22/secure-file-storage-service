import { Router } from "express";
import { requireAuth, ownsFile } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createFileSchema, visibilitySchema } from "../validators/files.validators";
import { asyncHandler } from "../lib/asyncHandler";
import {
  createFile,
  confirmFileUpload,
  listFiles,
  getFile,
  downloadFile,
  updateVisibility,
  removeFile,
  getStats,
} from "../controllers/files.controller";

const router = Router();

router.use(requireAuth);

router.get("/stats", asyncHandler(getStats));
router.get("/", asyncHandler(listFiles));
router.post("/", validate(createFileSchema), asyncHandler(createFile));

router.patch("/:id/confirm", asyncHandler(confirmFileUpload));
router.get("/:id", ownsFile, asyncHandler(getFile));
router.get("/:id/download", ownsFile, asyncHandler(downloadFile));
router.patch("/:id/visibility", ownsFile, validate(visibilitySchema), asyncHandler(updateVisibility));
router.delete("/:id", ownsFile, asyncHandler(removeFile));

export default router;
