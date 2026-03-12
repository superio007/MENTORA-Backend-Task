# Validation Middleware

This module provides input validation infrastructure using Zod schemas and Express middleware.

## Overview

The validation middleware ensures that all incoming requests are validated against predefined schemas before reaching business logic. This implements a fail-fast approach where invalid data is rejected at the API boundary.

## Features

- **Type-safe validation** using Zod schemas
- **Field-specific error messages** for better client feedback
- **Automatic data transformation** (e.g., string to number conversion)
- **Consistent error response format** across all endpoints
- **Validation for body, query, and params**

## Available Schemas

### Authentication

- `loginSchema` - Validates login requests (email, password)

### Students

- `createStudentSchema` - Validates student creation (name, email)

### Lessons

- `createLessonSchema` - Validates lesson creation (title, description, capacity)

### Bookings

- `createBookingSchema` - Validates booking creation (studentId, lessonId)

### Sessions

- `createSessionSchema` - Validates session creation (lessonId, scheduledAt, durationMinutes, notes)

### LLM

- `llmSummarizeSchema` - Validates LLM summarization requests (text with max 50KB)

### Pagination

- `paginationSchema` - Validates pagination parameters (page, limit)

## Usage

### Basic Usage

Import the validation middleware and schema, then apply it to your route:

```typescript
import { Router } from "express";
import { validateRequest, loginSchema } from "../../middleware/validation";
import { login } from "./auth.controller";

const router = Router();

// Apply validation middleware before controller
router.post("/login", validateRequest(loginSchema), login);

export default router;
```

### Validating Request Body (default)

```typescript
// Validates req.body
router.post("/students", validateRequest(createStudentSchema), createStudent);
```

### Validating Query Parameters

```typescript
// Validates req.query
router.get("/lessons", validateRequest(paginationSchema, "query"), listLessons);
```

### Validating URL Parameters

```typescript
import { z } from "zod";

const idSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

// Validates req.params
router.get("/students/:id", validateRequest(idSchema, "params"), getStudent);
```

### Multiple Validations

You can chain multiple validation middleware for different parts of the request:

```typescript
router.get("/lessons", validateRequest(paginationSchema, "query"), listLessons);
```

## Error Response Format

When validation fails, the middleware returns a 400 status code with the following JSON structure:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "Invalid email format",
      "capacity": "Capacity must be greater than 0"
    }
  }
}
```

## Creating Custom Schemas

You can create custom validation schemas using Zod:

```typescript
import { z } from "zod";

// Define your schema
const updateLessonSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().positive().optional(),
});

// Use it in your routes
router.put("/lessons/:id", validateRequest(updateLessonSchema), updateLesson);
```

## Validation Rules

### Email Validation

- Must be a valid email format
- Uses Zod's built-in email validator

### String Length

- `name`: 1-255 characters
- `title`: 1-255 characters
- `description`: max 1000 characters
- `notes`: max 1000 characters
- `text` (LLM): max 50KB (51,200 characters)

### Numeric Ranges

- `capacity`: must be > 0 (positive integer)
- `durationMinutes`: must be > 0 (positive integer)
- `page`: must be > 0 (positive integer)
- `limit`: must be between 1 and 100

### UUID Validation

- `studentId`, `lessonId`: must be valid UUID format

### DateTime Validation

- `scheduledAt`: must be valid ISO 8601 datetime format

### Pagination Defaults

- `page`: defaults to 1 if not provided
- `limit`: defaults to 10 if not provided

## Requirements Validation

This validation infrastructure validates the following requirements:

- **Requirement 9.1**: Request body validation against endpoint schema
- **Requirement 9.2**: 400 status code with specific validation errors
- **Requirement 9.3**: Required field validation
- **Requirement 9.4**: Field type validation
- **Requirement 9.5**: String length constraint validation
- **Requirement 9.6**: Numeric range constraint validation
- **Requirement 9.7**: Email format validation

## Testing

The validation middleware includes comprehensive unit tests covering:

- Schema validation for all data types
- Middleware behavior for valid and invalid data
- Error message formatting
- Data transformation
- Validation of body, query, and params

Run tests with:

```bash
npm test -- src/middleware/validation.test.ts
```

## Best Practices

1. **Always validate at the route level** - Apply validation middleware before your controller
2. **Use specific schemas** - Create focused schemas for each endpoint
3. **Provide clear error messages** - Use descriptive validation messages in schemas
4. **Validate early** - Validation should be the first middleware after authentication/authorization
5. **Don't duplicate validation** - Trust the validated data in your controllers
6. **Transform data** - Use Zod's transform capabilities to convert types (e.g., string to number)

## Example: Complete Route Setup

```typescript
import { Router } from "express";
import {
  validateRequest,
  createLessonSchema,
  paginationSchema,
} from "../../middleware/validation";
import { authenticateJWT, requireRole } from "../auth/auth.middleware";
import { createLesson, listLessons, getLesson } from "./lessons.controller";

const router = Router();

// Create lesson - requires authentication, role check, and validation
router.post(
  "/lessons",
  authenticateJWT,
  requireRole("mentor"),
  validateRequest(createLessonSchema),
  createLesson,
);

// List lessons - public endpoint with pagination validation
router.get("/lessons", validateRequest(paginationSchema, "query"), listLessons);

// Get lesson by ID - public endpoint
router.get("/lessons/:id", getLesson);

export default router;
```
