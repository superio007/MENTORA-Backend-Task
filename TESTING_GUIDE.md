# Testing Guide - Mentorship Platform API

## Overview

This guide provides step-by-step instructions for testing all API features, with emphasis on permission and authorization scenarios.

## Prerequisites

- API running on `http://localhost:3000`
- `curl` or Postman installed
- Test data created (users, students, lessons)

## Quick Setup

### 1. Create Test Users

```bash
# Create Parent User
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "password123",
    "role": "parent"
  }'

# Create Mentor User
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor@test.com",
    "password": "password123",
    "role": "mentor"
  }'

# Create Student User
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "role": "student"
  }'
```

### 2. Get Authentication Tokens

```bash
# Get Parent Token
PARENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Parent Token: $PARENT_TOKEN"

# Get Mentor Token
MENTOR_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor@test.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Mentor Token: $MENTOR_TOKEN"

# Get Student Token
STUDENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Student Token: $STUDENT_TOKEN"
```

### 3. Create Test Data

```bash
# Parent creates a student
STUDENT_ID=$(curl -s -X POST http://localhost:3000/students \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@test.com"
  }' | jq -r '.id')

echo "Student ID: $STUDENT_ID"

# Mentor creates a lesson
LESSON_ID=$(curl -s -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Basics",
    "description": "Learn JavaScript fundamentals",
    "capacity": 5
  }' | jq -r '.id')

echo "Lesson ID: $LESSON_ID"
```

---

## Test Scenarios

### Test Suite 1: Authentication

#### Test 1.1: Successful Login

**Objective**: Verify user can login with correct credentials

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "password123"
  }'
```

**Expected Response**: 200 OK

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "parent@test.com",
    "role": "parent"
  }
}
```

**Verification**:

- ✅ Status code is 200
- ✅ Token is returned
- ✅ User object contains correct email and role

---

#### Test 1.2: Failed Login - Wrong Password

**Objective**: Verify login fails with incorrect password

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "wrongpassword"
  }'
```

**Expected Response**: 401 Unauthorized

```json
{
  "error": {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS"
  }
}
```

**Verification**:

- ✅ Status code is 401
- ✅ No token is returned
- ✅ Error message is clear

---

#### Test 1.3: Missing Authentication Header

**Objective**: Verify protected endpoints require authentication

```bash
curl -X GET http://localhost:3000/students
```

**Expected Response**: 401 Unauthorized

```json
{
  "error": {
    "message": "Authentication required",
    "code": "AUTH_REQUIRED"
  }
}
```

**Verification**:

- ✅ Status code is 401
- ✅ Error code is AUTH_REQUIRED

---

### Test Suite 2: Booking Permissions

#### Test 2.1: Parent Creates Booking (Success)

**Objective**: Verify parent can book their own student into a lesson

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"lessonId\": \"$LESSON_ID\"
  }"
```

**Expected Response**: 201 Created

```json
{
  "id": "booking-uuid",
  "studentId": "student-uuid",
  "lessonId": "lesson-uuid",
  "createdAt": "2024-03-20T10:00:00Z"
}
```

**Verification**:

- ✅ Status code is 201
- ✅ Booking ID is returned
- ✅ Booking contains correct student and lesson IDs

---

#### Test 2.2: Parent Cannot Book Other Parent's Student

**Objective**: Verify parent cannot book students they don't own

**Setup**: Create another parent and their student

```bash
# Create second parent
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent2@test.com",
    "password": "password123",
    "role": "parent"
  }'

# Get second parent token
PARENT2_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent2@test.com",
    "password": "password123"
  }' | jq -r '.token')

# Second parent creates their student
STUDENT2_ID=$(curl -s -X POST http://localhost:3000/students \
  -H "Authorization: Bearer $PARENT2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@test.com"
  }' | jq -r '.id')

# First parent tries to book second parent's student
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT2_ID\",
    \"lessonId\": \"$LESSON_ID\"
  }"
```

**Expected Response**: 403 Forbidden

```json
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

**Verification**:

- ✅ Status code is 403
- ✅ Error code is FORBIDDEN
- ✅ Booking is not created

---

#### Test 2.3: Mentor Cannot Create Booking

**Objective**: Verify only parents can create bookings

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"lessonId\": \"$LESSON_ID\"
  }"
```

**Expected Response**: 403 Forbidden

```json
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

**Verification**:

- ✅ Status code is 403
- ✅ Mentor cannot create bookings

---

#### Test 2.4: Duplicate Booking Prevention

**Objective**: Verify student cannot be booked twice for same lesson

```bash
# First booking (already created in Test 2.1)
# Try to create duplicate booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"lessonId\": \"$LESSON_ID\"
  }"
```

**Expected Response**: 409 Conflict

```json
{
  "error": {
    "message": "Student is already booked for this lesson",
    "code": "DUPLICATE_BOOKING"
  }
}
```

**Verification**:

- ✅ Status code is 409
- ✅ Error code is DUPLICATE_BOOKING
- ✅ Duplicate booking is prevented

---

#### Test 2.5: Capacity Exceeded

**Objective**: Verify lesson capacity limits are enforced

**Setup**: Create lesson with capacity 1

```bash
# Create lesson with capacity 1
LIMITED_LESSON_ID=$(curl -s -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Limited Lesson",
    "description": "Only 1 spot available",
    "capacity": 1
  }' | jq -r '.id')

# Create second student
STUDENT3_ID=$(curl -s -X POST http://localhost:3000/students \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Smith",
    "email": "bob@test.com"
  }' | jq -r '.id')

# Book first student (succeeds)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"lessonId\": \"$LIMITED_LESSON_ID\"
  }"

# Try to book second student (fails - capacity exceeded)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT3_ID\",
    \"lessonId\": \"$LIMITED_LESSON_ID\"
  }"
```

**Expected Response**: 400 Bad Request

```json
{
  "error": {
    "message": "Lesson capacity exceeded",
    "code": "CAPACITY_EXCEEDED"
  }
}
```

**Verification**:

- ✅ Status code is 400
- ✅ Error code is CAPACITY_EXCEEDED
- ✅ First booking succeeds
- ✅ Second booking fails

---

#### Test 2.6: Parent Views Own Bookings

**Objective**: Verify parent can view bookings for their students

```bash
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

**Expected Response**: 200 OK

```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "studentId": "student-uuid",
      "lessonId": "lesson-uuid",
      "createdAt": "2024-03-20T10:00:00Z"
    }
  ]
}
```

**Verification**:

- ✅ Status code is 200
- ✅ Returns bookings for parent's students only
- ✅ Does not include other parents' bookings

---

#### Test 2.7: Mentor Views Own Bookings

**Objective**: Verify mentor can view bookings for their lessons

```bash
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

**Expected Response**: 200 OK

```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "studentId": "student-uuid",
      "lessonId": "lesson-uuid",
      "createdAt": "2024-03-20T10:00:00Z"
    }
  ]
}
```

**Verification**:

- ✅ Status code is 200
- ✅ Returns bookings for mentor's lessons only
- ✅ Does not include other mentors' bookings

---

#### Test 2.8: Parent Deletes Own Booking

**Objective**: Verify parent can cancel bookings for their students

```bash
# Get booking ID from previous test
BOOKING_ID="booking-uuid"

curl -X DELETE http://localhost:3000/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

**Expected Response**: 204 No Content

**Verification**:

- ✅ Status code is 204
- ✅ Booking is deleted
- ✅ Subsequent GET returns empty list

---

#### Test 2.9: Mentor Deletes Booking for Own Lesson

**Objective**: Verify mentor can cancel bookings for their lessons

```bash
# Create new booking
NEW_BOOKING_ID=$(curl -s -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"lessonId\": \"$LESSON_ID\"
  }" | jq -r '.id')

# Mentor deletes booking
curl -X DELETE http://localhost:3000/bookings/$NEW_BOOKING_ID \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

**Expected Response**: 204 No Content

**Verification**:

- ✅ Status code is 204
- ✅ Booking is deleted
- ✅ Mentor can cancel bookings for their lessons

---

### Test Suite 3: Session Permissions

#### Test 3.1: Mentor Creates Session (Success)

**Objective**: Verify mentor can create sessions for their lessons

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lessonId\": \"$LESSON_ID\",
    \"scheduledAt\": \"2024-03-25T10:00:00Z\",
    \"durationMinutes\": 60,
    \"notes\": \"First session - introduction\"
  }"
```

**Expected Response**: 201 Created

```json
{
  "id": "session-uuid",
  "lessonId": "lesson-uuid",
  "scheduledAt": "2024-03-25T10:00:00Z",
  "durationMinutes": 60,
  "notes": "First session - introduction",
  "createdAt": "2024-03-20T10:00:00Z",
  "updatedAt": "2024-03-20T10:00:00Z"
}
```

**Verification**:

- ✅ Status code is 201
- ✅ Session ID is returned
- ✅ Session contains correct lesson ID

---

#### Test 3.2: Mentor Cannot Create Session for Other Mentor's Lesson

**Objective**: Verify mentor cannot create sessions for lessons they don't own

**Setup**: Create second mentor

```bash
# Create second mentor
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor2@test.com",
    "password": "password123",
    "role": "mentor"
  }'

# Get second mentor token
MENTOR2_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor2@test.com",
    "password": "password123"
  }' | jq -r '.token')

# Second mentor tries to create session for first mentor's lesson
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lessonId\": \"$LESSON_ID\",
    \"scheduledAt\": \"2024-03-25T10:00:00Z\",
    \"durationMinutes\": 60,
    \"notes\": \"Unauthorized session\"
  }"
```

**Expected Response**: 403 Forbidden

```json
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

**Verification**:

- ✅ Status code is 403
- ✅ Error code is FORBIDDEN
- ✅ Session is not created

---

#### Test 3.3: Parent Cannot Create Session

**Objective**: Verify only mentors can create sessions

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lessonId\": \"$LESSON_ID\",
    \"scheduledAt\": \"2024-03-25T10:00:00Z\",
    \"durationMinutes\": 60,
    \"notes\": \"Unauthorized\"
  }"
```

**Expected Response**: 403 Forbidden

**Verification**:

- ✅ Status code is 403
- ✅ Parent cannot create sessions

---

#### Test 3.4: Only Mentor Can View Sessions

**Objective**: Verify only mentors can view sessions

```bash
# Parent tries to view sessions
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

**Expected Response**: 403 Forbidden

```bash
# Mentor views sessions
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

**Expected Response**: 200 OK

```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "lessonId": "lesson-uuid",
      "scheduledAt": "2024-03-25T10:00:00Z",
      "durationMinutes": 60,
      "notes": "First session - introduction",
      "createdAt": "2024-03-20T10:00:00Z",
      "updatedAt": "2024-03-20T10:00:00Z"
    }
  ]
}
```

**Verification**:

- ✅ Parent gets 403
- ✅ Mentor gets 200 with sessions

---

### Test Suite 4: Lesson Permissions

#### Test 4.1: Mentor Creates Lesson (Success)

**Objective**: Verify mentor can create lessons

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

**Expected Response**: 201 Created

**Verification**:

- ✅ Status code is 201
- ✅ Lesson is created with mentor as owner

---

#### Test 4.2: Parent Cannot Create Lesson

**Objective**: Verify only mentors can create lessons

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

**Expected Response**: 403 Forbidden

**Verification**:

- ✅ Status code is 403
- ✅ Parent cannot create lessons

---

#### Test 4.3: Public Can View Lessons

**Objective**: Verify lessons are publicly viewable

```bash
# Without authentication
curl -X GET http://localhost:3000/lessons?page=1&limit=10
```

**Expected Response**: 200 OK

```json
{
  "lessons": [
    {
      "id": "lesson-uuid",
      "title": "JavaScript Basics",
      "description": "Learn JavaScript fundamentals",
      "capacity": 5,
      "mentorId": "mentor-uuid",
      "createdAt": "2024-03-20T10:00:00Z",
      "updatedAt": "2024-03-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

**Verification**:

- ✅ Status code is 200
- ✅ Lessons are returned without authentication
- ✅ Pagination metadata is included

---

#### Test 4.4: Mentor Can Only Update Own Lesson

**Objective**: Verify mentor can only update lessons they own

```bash
# Update own lesson (success)
curl -X PUT http://localhost:3000/lessons/$LESSON_ID \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated JavaScript Basics",
    "description": "Updated description",
    "capacity": 20
  }'
```

**Expected Response**: 200 OK

```bash
# Try to update other mentor's lesson (fails)
curl -X PUT http://localhost:3000/lessons/$LESSON_ID \
  -H "Authorization: Bearer $MENTOR2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unauthorized Update",
    "description": "Should fail",
    "capacity": 20
  }'
```

**Expected Response**: 403 Forbidden

**Verification**:

- ✅ Mentor can update own lesson
- ✅ Mentor cannot update other mentor's lesson

---

#### Test 4.5: Mentor Can Only Delete Own Lesson

**Objective**: Verify mentor can only delete lessons they own

```bash
# Create lesson to delete
DELETE_LESSON_ID=$(curl -s -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lesson to Delete",
    "description": "Will be deleted",
    "capacity": 5
  }' | jq -r '.id')

# Delete own lesson (success)
curl -X DELETE http://localhost:3000/lessons/$DELETE_LESSON_ID \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

**Expected Response**: 204 No Content

```bash
# Try to delete other mentor's lesson (fails)
curl -X DELETE http://localhost:3000/lessons/$LESSON_ID \
  -H "Authorization: Bearer $MENTOR2_TOKEN"
```

**Expected Response**: 403 Forbidden

**Verification**:

- ✅ Mentor can delete own lesson
- ✅ Mentor cannot delete other mentor's lesson

---

## Automated Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Select `Mentorship-Platform-API-v2.postman_collection.json`
4. Collection is imported with all endpoints

### Set Environment Variables

1. Create new environment "Mentorship Test"
2. Add variables:
   - `base_url`: `http://localhost:3000`
   - `parent_token`: (leave empty, will be set by tests)
   - `mentor_token`: (leave empty, will be set by tests)
   - `student_id`: (leave empty, will be set by tests)
   - `lesson_id`: (leave empty, will be set by tests)
   - `booking_id`: (leave empty, will be set by tests)

### Run Tests

1. Select environment "Mentorship Test"
2. Run collection (Runner)
3. Tests execute in order with automatic token and ID management

---

## Troubleshooting

### Common Issues

**Issue**: "Student not found" when creating booking

- **Solution**: Verify student ID is correct and belongs to parent

**Issue**: "Lesson capacity exceeded" immediately

- **Solution**: Check lesson capacity and current booking count

**Issue**: "Insufficient permissions" on valid operation

- **Solution**: Verify user role and resource ownership

**Issue**: "Token expired"

- **Solution**: Get new token with login endpoint

### Debug Commands

```bash
# Check current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"

# List all lessons
curl -X GET http://localhost:3000/lessons

# List all students (requires auth)
curl -X GET http://localhost:3000/students \
  -H "Authorization: Bearer $PARENT_TOKEN"

# Check specific booking
curl -X GET http://localhost:3000/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $PARENT_TOKEN"
```

---

## Test Results Summary

After running all tests, you should see:

✅ Authentication tests: 3/3 passing
✅ Booking permission tests: 9/9 passing
✅ Session permission tests: 4/4 passing
✅ Lesson permission tests: 5/5 passing

**Total: 21 manual test scenarios**

Plus 98 automated unit and property-based tests in the test suite.

---

## Next Steps

1. Run all test scenarios
2. Verify all expected responses
3. Check error handling
4. Validate permission enforcement
5. Review logs for any issues
6. Approve for production

For questions, refer to [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or [PERMISSIONS.md](./PERMISSIONS.md).
