import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "../../utils/logger";

/**
 * LLM summarization response interface
 */
export interface SummarizeResponse {
  summary: string;
  bulletPoints?: string[];
  wordCount: number;
}

/**
 * Summarize text using Google Generative AI
 * Validates: Requirements 7.1, 7.2, 7.4
 *
 * @param text - Text to summarize (max 50KB)
 * @returns Summarized text with bullet points or summary
 * @throws Error if LLM service fails or times out
 */
export async function summarizeText(text: string): Promise<SummarizeResponse> {
  console.log("\n========== LLM SUMMARIZE START ==========");
  console.log(`[LLM] Input text length: ${text.length} characters`);

  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "gemini-2.5-flash";
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || "30000", 10);

  console.log(`[LLM] Configuration:`);
  console.log(`  - Model: ${model}`);
  console.log(`  - Timeout: ${timeoutMs}ms`);
  console.log(`  - API Key present: ${apiKey ? "✅ YES" : "❌ NO"}`);
  console.log(
    `  - API Key preview: ${apiKey ? apiKey.substring(0, 10) + "..." : "MISSING"}`,
  );

  if (!apiKey) {
    console.error("[LLM] ❌ ERROR: API key not configured");
    log.error("LLM API key configuration missing");
    throw new Error("LLM service not configured");
  }

  const prompt = `Summarize the following text in 3-6 bullet points or less than 120 words. Format the response as either:
1. A bulleted list (each bullet on a new line starting with "- ")
2. A concise paragraph (if less than 120 words)

Text to summarize:
${text}`;

  try {
    console.log("[LLM] 1️⃣ Initializing Google Generative AI client...");
    const client = new GoogleGenerativeAI(apiKey);
    console.log("[LLM] ✅ Client initialized");

    console.log(`[LLM] 2️⃣ Getting generative model: ${model}`);
    const generativeModel = client.getGenerativeModel({ model });
    console.log("[LLM] ✅ Model retrieved");

    console.log(
      `[LLM] 3️⃣ Sending request to Google API (timeout: ${timeoutMs}ms)...`,
    );
    const startTime = Date.now();

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        console.error(`[LLM] ⏱️ TIMEOUT: Request exceeded ${timeoutMs}ms`);
        reject(new Error("LLM request timeout"));
      }, timeoutMs),
    );

    // Race between the actual request and timeout
    const response = await Promise.race([
      generativeModel.generateContent(prompt),
      timeoutPromise,
    ]);

    const elapsedTime = Date.now() - startTime;
    console.log(`[LLM] ✅ Response received in ${elapsedTime}ms`);

    console.log("[LLM] 4️⃣ Parsing response...");
    const summary =
      (response as any).response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate summary";

    console.log(`[LLM] Summary length: ${summary.length} characters`);
    console.log(`[LLM] Summary preview: ${summary.substring(0, 100)}...`);

    // Parse bullet points if present
    console.log("[LLM] 5️⃣ Parsing bullet points...");
    const bulletPoints = summary
      .split("\n")
      .filter((line: string) => line.trim().startsWith("-"))
      .map((line: string) => line.trim().substring(1).trim());

    console.log(`[LLM] Found ${bulletPoints.length} bullet points`);
    bulletPoints.forEach((point: string, index: number) => {
      console.log(
        `  ${index + 1}. ${point.substring(0, 50)}${point.length > 50 ? "..." : ""}`,
      );
    });

    // Count words in summary
    const wordCount = summary.split(/\s+/).length;
    console.log(`[LLM] Word count: ${wordCount}`);

    // Validate summary meets requirements (3-6 bullets or <120 words)
    const hasBullets = bulletPoints.length > 0;
    console.log("[LLM] 6️⃣ Validating output format...");

    if (hasBullets) {
      console.log(
        `[LLM] Format: BULLET POINTS (${bulletPoints.length} bullets)`,
      );
      if (bulletPoints.length < 3 || bulletPoints.length > 6) {
        console.warn(
          `[LLM] ⚠️ WARNING: Expected 3-6 bullets, got ${bulletPoints.length}`,
        );
        log.warn(`Summary has ${bulletPoints.length} bullets, expected 3-6`);
      } else {
        console.log(`[LLM] ✅ Bullet count valid (${bulletPoints.length})`);
      }
    } else {
      console.log(`[LLM] Format: PARAGRAPH (${wordCount} words)`);
      if (wordCount > 120) {
        console.warn(`[LLM] ⚠️ WARNING: Expected <120 words, got ${wordCount}`);
        log.warn(`Summary has ${wordCount} words, expected <120`);
      } else {
        console.log(`[LLM] ✅ Word count valid (${wordCount})`);
      }
    }

    console.log("[LLM] ✅ SUMMARIZATION SUCCESSFUL");
    console.log("========== LLM SUMMARIZE END ==========\n");

    return {
      summary,
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined,
      wordCount,
    };
  } catch (error) {
    console.error("[LLM] ❌ ERROR OCCURRED");
    console.error(
      `[LLM] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
    );
    console.error(
      `[LLM] Error message: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(`[LLM] Full error:`, error);

    log.error("LLM service error", error);

    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error("[LLM] ❌ Identified as: TIMEOUT ERROR");
      throw new Error("LLM service request timed out");
    }

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes("API key")) {
      console.error("[LLM] ❌ Identified as: INVALID API KEY");
      throw new Error("Invalid LLM API key");
    }

    console.error("[LLM] ❌ Identified as: GENERIC SERVICE ERROR");
    console.log("========== LLM SUMMARIZE END (ERROR) ==========\n");
    throw new Error("LLM service unavailable");
  }
}
