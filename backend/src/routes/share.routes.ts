import { Router } from "express";
import { getSharedFile } from "../controllers/share.controller";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/:token", asyncHandler(getSharedFile));

export default router;
