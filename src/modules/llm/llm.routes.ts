import { Router } from "express";
import { summarizeController } from "./llm.controller";
import { authenticateJWT } from "../auth/auth.middleware";
import { validateRequest } from "../../middleware/validation";
import { llmSummarizeSchema } from "../../middleware/validation";

const router = Router();

/**
 * POST /llm/summarize - Generate text summary
 * Validates: Requirements 2.1, 7.1, 7.3, 7.4, 9.1
 *
 * Middleware chain:
 * 1. authenticateJWT - Verify user is authenticated
 * 2. validateRequest - Validate request body against schema (includes 50KB size check)
 * 3. summarizeController - Handle summarization request
 */
router.post(
  "/summarize",
  authenticateJWT,
  validateRequest(llmSummarizeSchema, "body"),
  summarizeController,
);

export default router;
