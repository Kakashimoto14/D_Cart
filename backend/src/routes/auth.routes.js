import { Router } from "express";
import { getMe, login, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.get("/me", authenticate, asyncHandler(getMe));

export default router;
