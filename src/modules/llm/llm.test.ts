import request from "supertest";
import app from "../../app";
import * as llmService from "./llm.service";
import { generateToken } from "../auth/auth.service";
import { resetRateLimitStore } from "../../middleware/rateLimiter";

// Mock the LLM service
jest.mock("./llm.service");

describe("LLM Module", () => {
  let authToken: string;
  const testUserId = "test-user-id";
  const testEmail = "test@example.com";

  beforeAll(() => {
    // Generate a valid JWT token for testing
    authToken = generateToken(testUserId, testEmail, "parent");
  });

  beforeEach(() => {
    // Reset rate limiter before each test
    resetRateLimitStore();
  });

  describe("POST /llm/summarize", () => {
    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .post("/llm/summarize")
        .send({ text: "Sample text to summarize" });

      expect(response.status).toBe(401);
    });

    it("should return 400 when text is missing", async () => {
      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when text is empty", async () => {
      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 413 when text exceeds 50KB", async () => {
      const oversizedText = "a".repeat(51 * 1024); // 51KB

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: oversizedText });

      // Validation returns 400, Express body size limit returns 413
      expect([400, 413]).toContain(response.status);
    });

    it("should successfully summarize text within size limit", async () => {
      const mockSummary = {
        summary: "- Point 1\n- Point 2\n- Point 3",
        bulletPoints: ["Point 1", "Point 2", "Point 3"],
        wordCount: 6,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Sample text to summarize" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSummary);
    });

    it("should return 500 when LLM service fails", async () => {
      (llmService.summarizeText as jest.Mock).mockRejectedValue(
        new Error("LLM service unavailable"),
      );

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Sample text to summarize" });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("LLM_ERROR");
      expect(response.body.error.message).toBe(
        "Unable to generate summary at this time",
      );
    });

    it("should accept text at exactly 50KB", async () => {
      const textAt50KB = "a".repeat(50 * 1024);
      const mockSummary = {
        summary: "Summary of large text",
        bulletPoints: undefined,
        wordCount: 4,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: textAt50KB });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSummary);
    });

    it("should return summary with bullet points when available", async () => {
      const mockSummary = {
        summary: "- First point\n- Second point\n- Third point",
        bulletPoints: ["First point", "Second point", "Third point"],
        wordCount: 6,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Long text content here" });

      expect(response.status).toBe(200);
      expect(response.body.bulletPoints).toEqual([
        "First point",
        "Second point",
        "Third point",
      ]);
    });

    it("should return summary without bullet points when not available", async () => {
      const mockSummary = {
        summary: "This is a concise summary of the text.",
        bulletPoints: undefined,
        wordCount: 10,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Text to summarize" });

      expect(response.status).toBe(200);
      expect(response.body.bulletPoints).toBeUndefined();
      expect(response.body.summary).toBe(
        "This is a concise summary of the text.",
      );
    });

    it("should include word count in response", async () => {
      const mockSummary = {
        summary: "Summary text",
        bulletPoints: undefined,
        wordCount: 2,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Text to summarize" });

      expect(response.status).toBe(200);
      expect(response.body.wordCount).toBe(2);
    });

    it("should call LLM service with provided text", async () => {
      const testText = "This is the text to summarize";
      const mockSummary = {
        summary: "Summary",
        bulletPoints: undefined,
        wordCount: 1,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: testText });

      expect(llmService.summarizeText).toHaveBeenCalledWith(testText);
    });
  });

  describe("LLM Service", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should handle timeout errors gracefully", async () => {
      const timeoutError = new Error("Timeout");
      (timeoutError as any).code = "ECONNABORTED";

      (llmService.summarizeText as jest.Mock).mockRejectedValue(timeoutError);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Text to summarize" });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe(
        "Unable to generate summary at this time",
      );
    });

    it("should not expose internal error details in response", async () => {
      (llmService.summarizeText as jest.Mock).mockRejectedValue(
        new Error("API key invalid"),
      );

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Text to summarize" });

      expect(response.status).toBe(500);
      expect(response.body.error.message).not.toContain("API key");
      expect(response.body.error.message).not.toContain("invalid");
    });
  });

  describe("Request Validation", () => {
    it("should validate text field is required", async () => {
      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.details).toHaveProperty("text");
    });

    it("should validate text size constraint", async () => {
      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "a".repeat(51 * 1024) });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toHaveProperty("text");
    });

    it("should accept valid text within constraints", async () => {
      const mockSummary = {
        summary: "Summary",
        bulletPoints: undefined,
        wordCount: 1,
      };

      (llmService.summarizeText as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ text: "Valid text to summarize" });

      expect(response.status).toBe(200);
    });
  });
});
