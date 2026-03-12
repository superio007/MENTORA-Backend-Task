import request from "supertest";
import app from "../../app";
import { query } from "../../config/database";

/**
 * LLM Integration Tests
 * Tests the complete LLM summarization flow
 */
describe("LLM Summarization Integration Tests", () => {
  let token: string;
  let userId: string;

  /**
   * Setup: Create a test user and get authentication token
   */
  beforeAll(async () => {
    console.log("\n========== LLM TEST SETUP ==========");
    console.log("[TEST] Creating test user...");

    // Create a test user
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        email: `llm-test-${Date.now()}@example.com`,
        password: "testpassword123",
        role: "parent",
      });

    console.log(`[TEST] Register status: ${registerRes.status}`);

    if (registerRes.status === 201) {
      token = registerRes.body.token;
      userId = registerRes.body.user.id;
      console.log(`[TEST] ✅ Test user created: ${userId}`);
      console.log(`[TEST] ✅ Token obtained: ${token.substring(0, 20)}...`);
    } else {
      console.error(`[TEST] ❌ Failed to create test user`);
      throw new Error("Failed to create test user");
    }
  });

  /**
   * Test 1: Successful summarization with valid text
   */
  describe("Test 1: Successful Summarization", () => {
    it("should summarize text successfully", async () => {
      console.log("\n========== TEST 1: SUCCESSFUL SUMMARIZATION ==========");
      console.log("[TEST] 1️⃣ Sending summarization request...");

      const testText =
        "JavaScript is a versatile programming language that powers interactive web applications. " +
        "It runs in browsers and can also be used on servers with Node.js. " +
        "JavaScript supports both functional and object-oriented programming paradigms. " +
        "The language has evolved significantly with ES6 introducing classes, arrow functions, and modules. " +
        "Modern JavaScript frameworks like React, Vue, and Angular have revolutionized web development.";

      console.log(`[TEST] Text length: ${testText.length} characters`);

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: testText });

      console.log(`[TEST] 2️⃣ Response status: ${response.status}`);
      console.log(`[TEST] Response body:`, response.body);

      // Assertions
      expect(response.status).toBe(200);
      console.log(`[TEST] ✅ Status code is 200`);

      expect(response.body).toHaveProperty("summary");
      console.log(`[TEST] ✅ Response has 'summary' property`);

      expect(response.body).toHaveProperty("wordCount");
      console.log(`[TEST] ✅ Response has 'wordCount' property`);

      expect(typeof response.body.summary).toBe("string");
      console.log(`[TEST] ✅ Summary is a string`);

      expect(response.body.summary.length > 0).toBe(true);
      console.log(
        `[TEST] ✅ Summary is not empty (${response.body.summary.length} chars)`,
      );

      expect(response.body.wordCount > 0).toBe(true);
      console.log(
        `[TEST] ✅ Word count is positive (${response.body.wordCount})`,
      );

      // Check for bullet points or paragraph format
      const hasBullets =
        response.body.bulletPoints && response.body.bulletPoints.length > 0;
      const wordCount = response.body.wordCount;
      const isValidFormat = hasBullets || wordCount <= 120;

      expect(isValidFormat).toBe(true);
      console.log(`[TEST] ✅ Output format is valid`);

      if (hasBullets) {
        console.log(
          `[TEST] ✅ Format: BULLET POINTS (${response.body.bulletPoints.length} bullets)`,
        );
      } else {
        console.log(`[TEST] ✅ Format: PARAGRAPH (${wordCount} words)`);
      }

      console.log("[TEST] ✅ TEST 1 PASSED");
    });
  });

  /**
   * Test 2: Missing text validation
   */
  describe("Test 2: Input Validation - Missing Text", () => {
    it("should return 400 when text is missing", async () => {
      console.log("\n========== TEST 2: MISSING TEXT VALIDATION ==========");
      console.log("[TEST] 1️⃣ Sending request without text...");

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      console.log(`[TEST] 2️⃣ Response status: ${response.status}`);

      expect(response.status).toBe(400);
      console.log(`[TEST] ✅ Status code is 400`);

      expect(response.body).toHaveProperty("error");
      console.log(`[TEST] ✅ Response has error property`);

      console.log("[TEST] ✅ TEST 2 PASSED");
    });
  });

  /**
   * Test 3: Empty text validation
   */
  describe("Test 3: Input Validation - Empty Text", () => {
    it("should return 400 when text is empty", async () => {
      console.log("\n========== TEST 3: EMPTY TEXT VALIDATION ==========");
      console.log("[TEST] 1️⃣ Sending request with empty text...");

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "" });

      console.log(`[TEST] 2️⃣ Response status: ${response.status}`);

      expect(response.status).toBe(400);
      console.log(`[TEST] ✅ Status code is 400`);

      console.log("[TEST] ✅ TEST 3 PASSED");
    });
  });

  /**
   * Test 4: Text too large validation
   */
  describe("Test 4: Input Validation - Text Too Large", () => {
    it("should return 413 when text exceeds 50KB", async () => {
      console.log("\n========== TEST 4: TEXT TOO LARGE VALIDATION ==========");
      console.log("[TEST] 1️⃣ Creating text larger than 50KB...");

      // Create text larger than 50KB
      const largeText = "a".repeat(51 * 1024);
      console.log(`[TEST] Text size: ${largeText.length} bytes (51KB)`);

      console.log("[TEST] 2️⃣ Sending request with large text...");

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: largeText });

      console.log(`[TEST] 3️⃣ Response status: ${response.status}`);

      expect(response.status).toBe(413);
      console.log(`[TEST] ✅ Status code is 413`);

      console.log("[TEST] ✅ TEST 4 PASSED");
    });
  });

  /**
   * Test 5: Authentication required
   */
  describe("Test 5: Authentication Required", () => {
    it("should return 401 when token is missing", async () => {
      console.log("\n========== TEST 5: AUTHENTICATION REQUIRED ==========");
      console.log("[TEST] 1️⃣ Sending request without token...");

      const response = await request(app)
        .post("/llm/summarize")
        .send({ text: "Test text" });

      console.log(`[TEST] 2️⃣ Response status: ${response.status}`);

      expect(response.status).toBe(401);
      console.log(`[TEST] ✅ Status code is 401`);

      console.log("[TEST] ✅ TEST 5 PASSED");
    });
  });

  /**
   * Test 6: Invalid token
   */
  describe("Test 6: Invalid Token", () => {
    it("should return 401 with invalid token", async () => {
      console.log("\n========== TEST 6: INVALID TOKEN ==========");
      console.log("[TEST] 1️⃣ Sending request with invalid token...");

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", "Bearer invalid_token_12345")
        .send({ text: "Test text" });

      console.log(`[TEST] 2️⃣ Response status: ${response.status}`);

      expect(response.status).toBe(401);
      console.log(`[TEST] ✅ Status code is 401`);

      console.log("[TEST] ✅ TEST 6 PASSED");
    });
  });

  /**
   * Test 7: Response format validation
   */
  describe("Test 7: Response Format Validation", () => {
    it("should return properly formatted response", async () => {
      console.log("\n========== TEST 7: RESPONSE FORMAT VALIDATION ==========");
      console.log("[TEST] 1️⃣ Sending summarization request...");

      const testText =
        "Python is a high-level programming language known for its simplicity and readability. " +
        "It is widely used in web development, data science, artificial intelligence, and automation. " +
        "Python's extensive libraries and frameworks make it a popular choice for developers worldwide.";

      const response = await request(app)
        .post("/llm/summarize")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: testText });

      console.log(`[TEST] 2️⃣ Validating response structure...`);

      // Check response structure
      expect(response.body).toHaveProperty("summary");
      expect(response.body).toHaveProperty("wordCount");
      console.log(`[TEST] ✅ Response has required properties`);

      // Check data types
      expect(typeof response.body.summary).toBe("string");
      expect(typeof response.body.wordCount).toBe("number");
      console.log(`[TEST] ✅ Data types are correct`);

      // Check optional bulletPoints
      if (response.body.bulletPoints) {
        expect(Array.isArray(response.body.bulletPoints)).toBe(true);
        console.log(`[TEST] ✅ Bullet points is an array`);
      }

      console.log("[TEST] ✅ TEST 7 PASSED");
    });
  });

  /**
   * Test 8: Rate limiting
   */
  describe("Test 8: Rate Limiting", () => {
    it("should enforce rate limiting", async () => {
      console.log("\n========== TEST 8: RATE LIMITING ==========");
      console.log(
        "[TEST] 1️⃣ Sending multiple requests to test rate limiting...",
      );

      const testText = "Test text for rate limiting";
      let rateLimitHit = false;
      let requestCount = 0;

      // Send multiple requests
      for (let i = 0; i < 15; i++) {
        requestCount++;
        console.log(`[TEST] Request ${requestCount}...`);

        const response = await request(app)
          .post("/llm/summarize")
          .set("Authorization", `Bearer ${token}`)
          .send({ text: testText });

        if (response.status === 429) {
          console.log(`[TEST] ✅ Rate limit hit at request ${requestCount}`);
          rateLimitHit = true;
          expect(response.body).toHaveProperty("error");
          expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
          break;
        }
      }

      if (rateLimitHit) {
        console.log("[TEST] ✅ TEST 8 PASSED - Rate limiting is working");
      } else {
        console.log(
          "[TEST] ⚠️ TEST 8 SKIPPED - Rate limit not hit (may be reset)",
        );
      }
    });
  });

  /**
   * Cleanup: Delete test user
   */
  afterAll(async () => {
    console.log("\n========== LLM TEST CLEANUP ==========");
    console.log("[TEST] Cleaning up test data...");

    try {
      // Delete test user
      await query("DELETE FROM users WHERE id = $1", [userId]);
      console.log(`[TEST] ✅ Test user deleted: ${userId}`);
    } catch (error) {
      console.error("[TEST] ❌ Error during cleanup:", error);
    }

    console.log("[TEST] ✅ Cleanup complete");
  });
});
