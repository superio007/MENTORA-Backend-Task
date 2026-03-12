# Reviewer Guide - Mentorship Platform API

## Overview

This guide helps reviewers understand, test, and approve the Mentorship Platform API. The API implements a comprehensive permission system with role-based access control for managing mentorship relationships, lesson bookings, and session scheduling.

## Quick Start for Reviewers

### 1. Understand the System

**Key Concepts**:

- **Three User Roles**: Parent, Mentor, Student
- **Resource Ownership**: Users can only manage resources they own
- **Capacity Management**: Lessons have booking limits
- **Duplicate Prevention**: Students can only be booked once per lesson

**Documentation to Read**:

1. [README.md](./README.md) - Project overview
2. [PERMISSIONS.md](./PERMISSIONS.md) - Permission matrix and rules
3. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference

### 2. Review the Code

**Key Files to Review**:

- `src/modules/auth/auth.middleware.ts` - Authentication and authorization
- `src/modules/bookings/bookings.controller.ts` - Booking permission logic
- `src/modules/sessions/sessions.controller.ts` - Session permission logic
- `src/modules/lessons/lessons.controller.ts` - Lesson permission logic

**What to Look For**:

- ✅ Role checks with `requireRole()` middleware
- ✅ Ownership verification before operations
- ✅ Proper error responses (401, 403, 404, 409)
- ✅ Input validation
- ✅ Logging of security events

### 3. Run the Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test -- --run

# Expected: 98 tests passing (72 unit + 26 property-based)
```

### 4. Manual Testing

Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md) for step-by-step manual testing:

```bash
# Quick test: Create users and test booking flow
npm run dev  # Start server in another terminal

# Then follow TESTING_GUIDE.md setup section
```

---

## Review Checklist

### Authentication & Authorization

- [ ] JWT tokens are properly validated
- [ ] Tokens include user ID and role
- [ ] Token expiration is enforced
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Missing tokens return 401 Unauthorized
- [ ] Role-based access control is enforced
- [ ] Users cannot access endpoints for other roles

**Files to Review**: `src/modules/auth/auth.middleware.ts`, `src/modules/auth/auth.service.ts`

**Test**: Run Test Suite 1 in TESTING_GUIDE.md

---

### Booking Permissions

- [ ] Only parents can create bookings
- [ ] Parents can only book their own students
- [ ] Lesson capacity is enforced
- [ ] Duplicate bookings are prevented (409 Conflict)
- [ ] Parents can view bookings for their students
- [ ] Mentors can view bookings for their lessons
- [ ] Parents can delete bookings for their students
- [ ] Mentors can delete bookings for their lessons
- [ ] Proper error messages for permission denials

**Files to Review**: `src/modules/bookings/bookings.controller.ts`, `src/modules/bookings/bookings.routes.ts`

**Test**: Run Test Suite 2 in TESTING_GUIDE.md

**Key Test Cases**:

- Parent books own student → 201 Created ✅
- Parent books other parent's student → 403 Forbidden ✅
- Mentor creates booking → 403 Forbidden ✅
- Duplicate booking → 409 Conflict ✅
- Capacity exceeded → 400 Bad Request ✅

---

### Session Permissions

- [ ] Only mentors can create sessions
- [ ] Mentors can only create sessions for their lessons
- [ ] Only mentors can view sessions
- [ ] Mentors can only view their own sessions
- [ ] Only mentors can update sessions
- [ ] Mentors can only update their own sessions
- [ ] Only mentors can delete sessions
- [ ] Mentors can only delete their own sessions
- [ ] Proper error messages for permission denials

**Files to Review**: `src/modules/sessions/sessions.controller.ts`, `src/modules/sessions/sessions.routes.ts`

**Test**: Run Test Suite 3 in TESTING_GUIDE.md

**Key Test Cases**:

- Mentor creates session for own lesson → 201 Created ✅
- Mentor creates session for other mentor's lesson → 403 Forbidden ✅
- Parent creates session → 403 Forbidden ✅
- Parent views sessions → 403 Forbidden ✅

---

### Lesson Permissions

- [ ] Only mentors can create lessons
- [ ] Lessons are publicly viewable
- [ ] Only mentors can update lessons
- [ ] Mentors can only update their own lessons
- [ ] Only mentors can delete lessons
- [ ] Mentors can only delete their own lessons
- [ ] Capacity must be positive integer
- [ ] Proper error messages for permission denials

**Files to Review**: `src/modules/lessons/lessons.controller.ts`, `src/modules/lessons/lessons.routes.ts`

**Test**: Run Test Suite 4 in TESTING_GUIDE.md

**Key Test Cases**:

- Mentor creates lesson → 201 Created ✅
- Parent creates lesson → 403 Forbidden ✅
- Public views lessons → 200 OK (no auth required) ✅
- Mentor updates own lesson → 200 OK ✅
- Mentor updates other mentor's lesson → 403 Forbidden ✅

---

### Student Permissions

- [ ] Only parents can create students
- [ ] Parents can only manage their own students
- [ ] Mentors can view all students
- [ ] Students cannot create other students
- [ ] Proper error messages for permission denials

**Files to Review**: `src/modules/students/students.controller.ts`, `src/modules/students/students.routes.ts`

**Test**: Manual testing or review test files

---

### Data Integrity

- [ ] Foreign key constraints prevent invalid references
- [ ] Unique constraints prevent duplicates
- [ ] Check constraints validate data ranges
- [ ] Cascading deletes work correctly
- [ ] Database transactions maintain consistency

**Files to Review**: `src/config/migrations/001_initial_schema.sql`

**Test**: Review database schema and constraints

---

### Error Handling

- [ ] All endpoints return appropriate HTTP status codes
- [ ] Error messages don't expose sensitive information
- [ ] Validation errors are clear and actionable
- [ ] Error responses follow consistent format
- [ ] Rate limiting returns 429 status
- [ ] Proper error codes for different scenarios

**Files to Review**: `src/middleware/errorHandler.ts`, `src/middleware/validation.ts`

**Test**: Review error responses in test cases

**Expected Error Codes**:

- `AUTH_REQUIRED` (401) - Missing token
- `INVALID_TOKEN` (401) - Invalid token
- `TOKEN_EXPIRED` (401) - Expired token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `DUPLICATE_BOOKING` (409) - Duplicate booking
- `CAPACITY_EXCEEDED` (400) - Lesson full
- `INVALID_REFERENCE` (400) - Invalid foreign key

---

### Security

- [ ] Passwords are hashed with bcrypt (cost factor 10)
- [ ] Sensitive data is never logged (passwords, tokens, API keys)
- [ ] CORS is properly configured
- [ ] Security headers are set (Helmet)
- [ ] Input validation prevents injection attacks
- [ ] Rate limiting prevents abuse
- [ ] No SQL injection vulnerabilities
- [ ] No cross-site scripting (XSS) vulnerabilities

**Files to Review**:

- `src/modules/auth/auth.service.ts` - Password hashing
- `src/middleware/security.ts` - Security headers
- `src/middleware/requestLogger.ts` - Sensitive data redaction
- `src/middleware/validation.ts` - Input validation

---

### Testing

- [ ] All 98 tests pass
- [ ] Unit tests cover all modules
- [ ] Property-based tests cover edge cases
- [ ] Permission tests verify access control
- [ ] Integration tests verify workflows
- [ ] Test coverage is comprehensive

**Run Tests**:

```bash
npm test -- --run
```

**Expected Output**:

```
PASS  src/modules/auth/auth.controller.test.ts
PASS  src/modules/bookings/bookings.controller.test.ts
PASS  src/modules/sessions/sessions.controller.ts
PASS  src/modules/lessons/lessons.controller.test.ts
...
Test Suites: 8 passed, 8 total
Tests:       98 passed, 98 total
```

---

### Documentation

- [ ] README.md is comprehensive and up-to-date
- [ ] API_DOCUMENTATION.md covers all endpoints
- [ ] PERMISSIONS.md explains authorization rules
- [ ] TESTING_GUIDE.md provides testing instructions
- [ ] Code comments explain complex logic
- [ ] Error codes are documented
- [ ] Examples are provided for all endpoints

**Files to Review**:

- [README.md](./README.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [PERMISSIONS.md](./PERMISSIONS.md)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Testing Workflow

### Step 1: Setup Test Environment

```bash
# Start the API server
npm run dev

# In another terminal, follow TESTING_GUIDE.md setup
```

### Step 2: Run Automated Tests

```bash
npm test -- --run
```

### Step 3: Run Manual Tests

Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md) for:

- Authentication tests (Test Suite 1)
- Booking permission tests (Test Suite 2)
- Session permission tests (Test Suite 3)
- Lesson permission tests (Test Suite 4)

### Step 4: Test with Postman

1. Import `Mentorship-Platform-API-v2.postman_collection.json`
2. Set environment variables
3. Run collection tests

### Step 5: Verify Error Handling

Test error scenarios:

- Invalid credentials
- Missing authentication
- Insufficient permissions
- Resource not found
- Duplicate entries
- Capacity exceeded
- Invalid input

---

## Common Issues & Solutions

### Issue: Tests Fail

**Solution**:

1. Check database is running
2. Run migrations: `npm run migrate`
3. Check environment variables in `.env`
4. Clear database and retry

### Issue: Permission Denied on Valid Operation

**Solution**:

1. Verify user role is correct
2. Verify user owns the resource
3. Check token is valid and not expired
4. Review permission matrix in PERMISSIONS.md

### Issue: Capacity Exceeded Immediately

**Solution**:

1. Check lesson capacity value
2. Count existing bookings
3. Verify booking count logic

### Issue: Duplicate Booking Not Prevented

**Solution**:

1. Check database constraint exists
2. Verify application-level check
3. Review bookings.controller.ts logic

---

## Approval Criteria

✅ **Approve if**:

- All 98 tests pass
- All checklist items are verified
- No security vulnerabilities found
- Documentation is complete
- Manual testing passes
- Error handling is correct
- Permission enforcement is working

❌ **Request Changes if**:

- Tests fail
- Permission checks are missing
- Security vulnerabilities exist
- Documentation is incomplete
- Error handling is inconsistent
- Manual testing fails

---

## Sign-Off

**Reviewer Name**: ********\_\_\_********

**Date**: ********\_\_\_********

**Status**:

- [ ] Approved
- [ ] Approved with Comments
- [ ] Request Changes
- [ ] Rejected

**Comments**:

```
[Add any comments or concerns here]
```

---

## Additional Resources

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
- [PERMISSIONS.md](./PERMISSIONS.md) - Permission matrix and rules
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Manual testing guide
- [README.md](./README.md) - Project overview

## Support

For questions during review:

1. Check the documentation files
2. Review the test files for examples
3. Check the code comments
4. Contact the development team

---

**Last Updated**: March 2024
**API Version**: 1.0.0
**Status**: Ready for Review
