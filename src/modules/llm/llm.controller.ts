import { Request, Response } from "express";
import { summarizeText } from "./llm.service";
import { log } from "../../utils/logger";

/**
 * POST /llm/summarize - Generate text summary using LLM
 * Validates: Requirements 7.1, 7.3, 7.4
 *
 * @param req - Express request with authenticated user and text in body
 * @param res - Express response
 */
export async function summarizeController(
  req: Request,
  res: Response,
): Promise<void> {
  console.log("\n========== LLM CONTROLLER START ==========");
  try {
    const { text } = req.body;
    const userId = (req as any).user?.userId;

    console.log(`[LLM-CTRL] 1️⃣ Summarization request received`);
    console.log(`[LLM-CTRL] User ID: ${userId}`);
    console.log(`[LLM-CTRL] Text length: ${text.length} characters`);

    log.info("LLM summarization request", {
      userId,
      textLength: text.length,
    });

    // Call LLM service to generate summary
    console.log(`[LLM-CTRL] 2️⃣ Calling LLM service...`);
    const result = await summarizeText(text);

    console.log(`[LLM-CTRL] ✅ Summary generated successfully`);
    console.log(`[LLM-CTRL] Word count: ${result.wordCount}`);
    console.log(
      `[LLM-CTRL] Bullet points: ${result.bulletPoints?.length || 0}`,
    );

    log.info("LLM summarization successful", {
      userId,
      wordCount: result.wordCount,
    });

    console.log(`[LLM-CTRL] 3️⃣ Sending response...`);
    res.status(200).json({
      summary: result.summary,
      bulletPoints: result.bulletPoints,
      wordCount: result.wordCount,
    });
    console.log("========== LLM CONTROLLER END (SUCCESS) ==========\n");
  } catch (error) {
    console.error("[LLM-CTRL] ❌ ERROR OCCURRED");
    console.error(
      `[LLM-CTRL] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
    );
    console.error(
      `[LLM-CTRL] Error message: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(`[LLM-CTRL] Full error:`, error);

    log.error("LLM summarization error", error, {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    // Return 500 with generic error message on LLM failure
    res.status(500).json({
      error: {
        message: "Unable to generate summary at this time",
        code: "LLM_ERROR",
      },
    });
    console.log("========== LLM CONTROLLER END (ERROR) ==========\n");
  }
}
