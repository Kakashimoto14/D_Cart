import { Router } from "express";
import { getDashboard } from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), asyncHandler(getDashboard));

export default router;
