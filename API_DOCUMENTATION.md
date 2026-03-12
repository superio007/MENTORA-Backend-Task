# API Documentation - Mentorship Platform Backend

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization & Permissions](#authorization--permissions)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Testing Guide](#testing-guide)
6. [Rate Limiting](#rate-limiting)

---

## Authentication

### JWT Token Structure

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Login Endpoint

**POST** `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (200 OK):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "parent"
  }
}
```

### Register Endpoint

**POST** `/auth/register`

Request:

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "parent"
}
```

Response (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "role": "parent"
}
```

---

## Authorization & Permissions

### User Roles

The system has three distinct user roles with specific permissions:

#### 1. **Parent**

- Can create and manage student accounts
- Can book students into lessons
- Can view bookings for their students
- Can cancel bookings for their students
- Cannot create lessons or sessions

#### 2. **Mentor**

- Can create and manage lessons
- Can create and manage sessions for their lessons
- Can view bookings for their lessons
- Can cancel bookings for their lessons
- Cannot create student accounts or bookings

#### 3. **Student**

- Can view lessons (public)
- Can view their own bookings
- Cannot create bookings or lessons

### Permission Matrix

| Action         | Parent            | Mentor           | Student     |
| -------------- | ----------------- | ---------------- | ----------- |
| Create Student | ✅                | ❌               | ❌          |
| View Students  | ✅ (own)          | ❌               | ❌          |
| Create Lesson  | ❌                | ✅               | ❌          |
| View Lessons   | ✅ (public)       | ✅ (public)      | ✅ (public) |
| Update Lesson  | ❌                | ✅ (own)         | ❌          |
| Delete Lesson  | ❌                | ✅ (own)         | ❌          |
| Create Booking | ✅                | ❌               | ❌          |
| View Bookings  | ✅ (own students) | ✅ (own lessons) | ✅ (own)    |
| Delete Booking | ✅ (own students) | ✅ (own lessons) | ❌          |
| Create Session | ❌                | ✅               | ❌          |
| View Sessions  | ✅ (public)       | ✅ (own lessons) | ✅ (public) |
| Update Session | ❌                | ✅ (own)         | ❌          |
| Delete Session | ❌                | ✅ (own)         | ❌          |

---

## API Endpoints

### Authentication Endpoints

#### Register User

```
POST /auth/register
```

- **Authentication**: Not required
- **Body**: `{ email, password, role }`
- **Response**: 201 Created - User object
- **Errors**: 400 Bad Request, 409 Conflict (duplicate email)

#### Login

```
POST /auth/login
```

- **Authentication**: Not required
- **Body**: `{ email, password }`
- **Response**: 200 OK - Token and user object
- **Errors**: 401 Unauthorized, 400 Bad Request

#### Get Current User

```
GET /auth/me
```

- **Authentication**: Required (JWT)
- **Response**: 200 OK - Current user object
- **Errors**: 401 Unauthorized

---

### Student Endpoints

#### Create Student

```
POST /students
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent only
- **Body**: `{ name, email }`
- **Response**: 201 Created - Student object
- **Errors**: 403 Forbidden, 400 Bad Request, 409 Conflict

#### Get Students

```
GET /students
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent (own students), Mentor (all students)
- **Query**: `page`, `limit`
- **Response**: 200 OK - Paginated student list
- **Errors**: 401 Unauthorized, 403 Forbidden

#### Get Student by ID

```
GET /students/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent (own student), Mentor (any student)
- **Response**: 200 OK - Student object
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Update Student

```
PUT /students/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent (own student)
- **Body**: `{ name, email }`
- **Response**: 200 OK - Updated student object
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Delete Student

```
DELETE /students/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent (own student)
- **Response**: 204 No Content
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

---

### Lesson Endpoints

#### Create Lesson

```
POST /lessons
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor only
- **Body**: `{ title, description, capacity }`
- **Response**: 201 Created - Lesson object
- **Errors**: 403 Forbidden, 400 Bad Request

**Example Request**:

```bash
curl -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced JavaScript",
    "description": "Learn advanced JS concepts",
    "capacity": 10
  }'
```

#### Get All Lessons

```
GET /lessons
```

- **Authentication**: Not required
- **Query**: `page`, `limit`
- **Response**: 200 OK - Paginated lesson list
- **Errors**: 400 Bad Request

#### Get Lesson by ID

```
GET /lessons/:id
```

- **Authentication**: Not required
- **Response**: 200 OK - Lesson object
- **Errors**: 404 Not Found

#### Get Lesson Sessions

```
GET /lessons/:id/sessions
```

- **Authentication**: Not required
- **Response**: 200 OK - Sessions array
- **Errors**: 404 Not Found

#### Update Lesson

```
PUT /lessons/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor (own lesson)
- **Body**: `{ title, description, capacity }`
- **Response**: 200 OK - Updated lesson object
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Delete Lesson

```
DELETE /lessons/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor (own lesson)
- **Response**: 204 No Content
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

---

### Booking Endpoints

#### Create Booking

```
POST /bookings
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent only
- **Body**: `{ studentId, lessonId }`
- **Response**: 201 Created - Booking object
- **Errors**: 403 Forbidden, 404 Not Found, 409 Conflict, 400 Bad Request

**Permission Checks**:

- Parent must own the student
- Lesson must exist
- Lesson must have available capacity
- Student cannot already be booked for this lesson

**Example Request**:

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <parent_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "550e8400-e29b-41d4-a716-446655440001",
    "lessonId": "550e8400-e29b-41d4-a716-446655440002"
  }'
```

**Error Responses**:

Capacity Exceeded (400):

```json
{
  "error": {
    "message": "Lesson capacity exceeded",
    "code": "CAPACITY_EXCEEDED"
  }
}
```

Duplicate Booking (409):

```json
{
  "error": {
    "message": "Student is already booked for this lesson",
    "code": "DUPLICATE_BOOKING"
  }
}
```

Insufficient Permissions (403):

```json
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

#### Get Bookings

```
GET /bookings
```

- **Authentication**: Required (JWT)
- **Authorization**: All roles (filtered by role)
- **Response**: 200 OK - Bookings array
- **Errors**: 401 Unauthorized

**Role-Based Filtering**:

- **Parent**: Returns bookings for their students
- **Mentor**: Returns bookings for their lessons
- **Student**: Returns their own bookings

#### Delete Booking

```
DELETE /bookings/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Parent (own student) or Mentor (own lesson)
- **Response**: 204 No Content
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

---

### Session Endpoints

#### Create Session

```
POST /sessions
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor only
- **Body**: `{ lessonId, scheduledAt, durationMinutes, notes }`
- **Response**: 201 Created - Session object
- **Errors**: 403 Forbidden, 404 Not Found, 400 Bad Request

**Permission Checks**:

- Mentor must own the associated lesson

**Example Request**:

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer <mentor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "550e8400-e29b-41d4-a716-446655440002",
    "scheduledAt": "2024-03-20T10:00:00Z",
    "durationMinutes": 60,
    "notes": "First session - introduction"
  }'
```

#### Get Sessions

```
GET /sessions
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor only
- **Response**: 200 OK - Sessions array
- **Errors**: 401 Unauthorized, 403 Forbidden

**Returns**: Only sessions for lessons owned by the authenticated mentor

#### Get Session by ID

```
GET /sessions/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor only
- **Response**: 200 OK - Session object
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Update Session

```
PUT /sessions/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor (own session)
- **Body**: `{ lessonId, scheduledAt, durationMinutes, notes }`
- **Response**: 200 OK - Updated session object
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### Delete Session

```
DELETE /sessions/:id
```

- **Authentication**: Required (JWT)
- **Authorization**: Mentor (own session)
- **Response**: 204 No Content
- **Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### HTTP Status Codes

| Status | Meaning               | Common Causes                         |
| ------ | --------------------- | ------------------------------------- |
| 200    | OK                    | Successful GET/PUT request            |
| 201    | Created               | Successful POST request               |
| 204    | No Content            | Successful DELETE request             |
| 400    | Bad Request           | Invalid input, validation error       |
| 401    | Unauthorized          | Missing or invalid token              |
| 403    | Forbidden             | Insufficient permissions              |
| 404    | Not Found             | Resource not found                    |
| 409    | Conflict              | Duplicate entry, constraint violation |
| 500    | Internal Server Error | Unexpected server error               |

### Common Error Codes

| Code              | HTTP Status | Description                       |
| ----------------- | ----------- | --------------------------------- |
| AUTH_REQUIRED     | 401         | Authentication token required     |
| INVALID_TOKEN     | 401         | Token is invalid or malformed     |
| TOKEN_EXPIRED     | 401         | Token has expired                 |
| FORBIDDEN         | 403         | User lacks required permissions   |
| NOT_FOUND         | 404         | Resource not found                |
| DUPLICATE_BOOKING | 409         | Student already booked for lesson |
| CAPACITY_EXCEEDED | 400         | Lesson has reached capacity       |
| INVALID_REFERENCE | 400         | Foreign key reference is invalid  |
| INVALID_CAPACITY  | 400         | Capacity must be greater than 0   |
| INVALID_DURATION  | 400         | Duration must be greater than 0   |

---

## Testing Guide

### Test Scenarios by Feature

#### 1. Authentication Testing

**Test Case 1.1: Successful Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "password": "password123"
  }'
```

Expected: 200 OK with token

**Test Case 1.2: Invalid Credentials**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "password": "wrongpassword"
  }'
```

Expected: 401 Unauthorized

**Test Case 1.3: Missing Token**

```bash
curl -X GET http://localhost:3000/students
```

Expected: 401 Unauthorized with "AUTH_REQUIRED"

---

#### 2. Booking Permission Testing

**Test Case 2.1: Parent Creates Booking (Success)**

```bash
# 1. Parent logs in
PARENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "parent@example.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Parent creates booking for their student
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id-owned-by-parent",
    "lessonId": "lesson-id"
  }'
```

Expected: 201 Created

**Test Case 2.2: Parent Cannot Book Student They Don't Own**

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id-owned-by-other-parent",
    "lessonId": "lesson-id"
  }'
```

Expected: 403 Forbidden with "FORBIDDEN"

**Test Case 2.3: Mentor Cannot Create Booking**

```bash
# 1. Mentor logs in
MENTOR_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "mentor@example.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Mentor tries to create booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id",
    "lessonId": "lesson-id"
  }'
```

Expected: 403 Forbidden

**Test Case 2.4: Duplicate Booking Prevention**

```bash
# Create first booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id",
    "lessonId": "lesson-id"
  }'

# Try to create duplicate booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-id",
    "lessonId": "lesson-id"
  }'
```

Expected: 409 Conflict with "DUPLICATE_BOOKING"

**Test Case 2.5: Capacity Exceeded**

```bash
# Create lesson with capacity 1
curl -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Limited Lesson",
    "description": "Only 1 spot",
    "capacity": 1
  }'

# Book first student (succeeds)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-1",
    "lessonId": "limited-lesson-id"
  }'

# Try to book second student (fails)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-2",
    "lessonId": "limited-lesson-id"
  }'
```

Expected: 400 Bad Request with "CAPACITY_EXCEEDED"

---

#### 3. Session Permission Testing

**Test Case 3.1: Mentor Creates Session (Success)**

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-owned-by-mentor",
    "scheduledAt": "2024-03-20T10:00:00Z",
    "durationMinutes": 60,
    "notes": "First session"
  }'
```

Expected: 201 Created

**Test Case 3.2: Mentor Cannot Create Session for Other Mentor's Lesson**

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-owned-by-other-mentor",
    "scheduledAt": "2024-03-20T10:00:00Z",
    "durationMinutes": 60,
    "notes": "Unauthorized session"
  }'
```

Expected: 403 Forbidden with "FORBIDDEN"

**Test Case 3.3: Parent Cannot Create Session**

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "lesson-id",
    "scheduledAt": "2024-03-20T10:00:00Z",
    "durationMinutes": 60,
    "notes": "Unauthorized"
  }'
```

Expected: 403 Forbidden

**Test Case 3.4: Only Mentor Can View Sessions**

```bash
# Parent tries to view sessions
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

Expected: 403 Forbidden

```bash
# Mentor views sessions
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

Expected: 200 OK with sessions array

---

#### 4. Lesson Permission Testing

**Test Case 4.1: Mentor Creates Lesson (Success)**

```bash
curl -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Basics",
    "description": "Learn Python fundamentals",
    "capacity": 15
  }'
```

Expected: 201 Created

**Test Case 4.2: Parent Cannot Create Lesson**

```bash
curl -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unauthorized Lesson",
    "description": "Should fail",
    "capacity": 10
  }'
```

Expected: 403 Forbidden

**Test Case 4.3: Public Can View Lessons**

```bash
# Without authentication
curl -X GET http://localhost:3000/lessons?page=1&limit=10
```

Expected: 200 OK with lessons array

**Test Case 4.4: Mentor Can Only Update Own Lesson**

```bash
# Update own lesson (success)
curl -X PUT http://localhost:3000/lessons/own-lesson-id \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "Updated description",
    "capacity": 20
  }'
```

Expected: 200 OK

```bash
# Try to update other mentor's lesson (fails)
curl -X PUT http://localhost:3000/lessons/other-mentor-lesson-id \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unauthorized Update",
    "description": "Should fail",
    "capacity": 20
  }'
```

Expected: 403 Forbidden

---

#### 5. Booking View Permission Testing

**Test Case 5.1: Parent Views Own Bookings**

```bash
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

Expected: 200 OK with bookings for their students only

**Test Case 5.2: Mentor Views Own Bookings**

```bash
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

Expected: 200 OK with bookings for their lessons only

**Test Case 5.3: Verify Data Isolation**

```bash
# Parent 1 should not see Parent 2's bookings
# Mentor 1 should not see Mentor 2's bookings
```

---

#### 6. Booking Deletion Permission Testing

**Test Case 6.1: Parent Deletes Own Booking**

```bash
curl -X DELETE http://localhost:3000/bookings/booking-id \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

Expected: 204 No Content (if parent owns the student)

**Test Case 6.2: Mentor Deletes Booking for Own Lesson**

```bash
curl -X DELETE http://localhost:3000/bookings/booking-id \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

Expected: 204 No Content (if mentor owns the lesson)

**Test Case 6.3: Parent Cannot Delete Other Parent's Booking**

```bash
curl -X DELETE http://localhost:3000/bookings/other-parent-booking-id \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

Expected: 403 Forbidden

---

### Automated Testing with Postman

Import the provided Postman collection: `Mentorship-Platform-API-v2.postman_collection.json`

The collection includes:

- Pre-configured requests for all endpoints
- Environment variables for tokens and IDs
- Test scripts for validation
- Permission-based test scenarios

---

## Rate Limiting

### Configuration

Rate limiting is applied to expensive endpoints:

```env
RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
RATE_LIMIT_MAX_REQUESTS=10      # 10 requests per window
```

### Limited Endpoints

- `POST /auth/login` - 5 requests per minute
- `POST /auth/register` - 5 requests per minute
- `POST /bookings` - 10 requests per minute
- `POST /sessions` - 10 requests per minute
- `POST /lessons` - 10 requests per minute

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "message": "Too many requests, please try again later",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

Status: 429 Too Many Requests

---

## Summary

This API implements a comprehensive permission system with:

✅ Role-based access control (Parent, Mentor, Student)
✅ Ownership verification for all resources
✅ Capacity management for lessons
✅ Duplicate prevention for bookings
✅ Consistent error handling
✅ Rate limiting for abuse prevention
✅ Comprehensive logging for audit trails

For questions or issues, refer to the main README.md or contact the development team.
