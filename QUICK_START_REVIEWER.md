# Quick Start for Reviewers

## 5-Minute Overview

This API implements a mentorship platform with three user roles (Parent, Mentor, Student) and comprehensive permission controls.

### Key Points

1. **Three Roles**:
   - **Parent**: Creates students, books lessons
   - **Mentor**: Creates lessons, creates sessions
   - **Student**: Views lessons, views bookings

2. **Core Features**:
   - JWT authentication
   - Role-based access control
   - Ownership verification (users can only manage their resources)
   - Capacity management (lessons have booking limits)
   - Duplicate prevention (students can only be booked once per lesson)

3. **Test Status**: ✅ 98 tests passing (72 unit + 26 property-based)

---

## 15-Minute Review

### Step 1: Understand Permissions (5 min)

Read [PERMISSIONS.md](./PERMISSIONS.md) - Permission Matrix section

Key takeaway: Each role has specific permissions, and users can only access their own resources.

### Step 2: Review Key Code (5 min)

Check these files for permission enforcement:

```typescript
// Authentication & Authorization
src/modules/auth/auth.middleware.ts
- authenticateJWT() - Validates JWT tokens
- requireRole() - Enforces role-based access

// Booking Permissions
src/modules/bookings/bookings.controller.ts
- createBookingController() - Verifies parent owns student
- getBookingsController() - Filters by role
- deleteBookingController() - Verifies ownership

// Session Permissions
src/modules/sessions/sessions.controller.ts
- createSessionController() - Verifies mentor owns lesson
- getSessionsController() - Mentor only

// Lesson Permissions
src/modules/lessons/lessons.controller.ts
- createLessonController() - Mentor only
- updateLessonController() - Verifies ownership
```

### Step 3: Run Tests (5 min)

```bash
npm install
npm test -- --run
```

Expected: All 98 tests pass ✅

---

## 30-Minute Deep Review

### Step 1: Read Documentation (10 min)

1. [README.md](./README.md) - Overview
2. [PERMISSIONS.md](./PERMISSIONS.md) - Permission matrix
3. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Error codes

### Step 2: Review Code (10 min)

Focus on these permission checks:

**Booking Creation** (src/modules/bookings/bookings.controller.ts):

```typescript
// Verify parent owns student
if (student.parent_id !== parentId) {
  return 403 Forbidden;
}

// Check capacity
if (currentBookings >= lesson.capacity) {
  return 400 Capacity Exceeded;
}

// Prevent duplicates (database constraint)
UNIQUE(student_id, lesson_id)
```

**Session Creation** (src/modules/sessions/sessions.controller.ts):

```typescript
// Verify mentor owns lesson
if (lessonMentorId !== mentorId) {
  return 403 Forbidden;
}
```

**Lesson Update** (src/modules/lessons/lessons.controller.ts):

```typescript
// Verify mentor owns lesson
if (lesson.mentor_id !== mentorId) {
  return 403 Forbidden;
}
```

### Step 3: Manual Testing (10 min)

Quick test flow:

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run quick tests
# 1. Create parent user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@test.com","password":"pass123","role":"parent"}'

# 2. Create mentor user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"mentor@test.com","password":"pass123","role":"mentor"}'

# 3. Parent tries to create lesson (should fail)
PARENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@test.com","password":"pass123"}' | jq -r '.token')

curl -X POST http://localhost:3000/lessons \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","capacity":5}'
# Expected: 403 Forbidden ✅
```

---

## Approval Checklist (Quick)

- [ ] All 98 tests pass
- [ ] Permission checks are in place (auth.middleware.ts)
- [ ] Ownership verification works (each controller)
- [ ] Error codes are correct (API_DOCUMENTATION.md)
- [ ] Documentation is complete (README.md, PERMISSIONS.md)
- [ ] Manual tests pass (quick test above)

---

## Key Files to Review

| File                                        | Purpose                        | Review Time |
| ------------------------------------------- | ------------------------------ | ----------- |
| src/modules/auth/auth.middleware.ts         | Authentication & authorization | 5 min       |
| src/modules/bookings/bookings.controller.ts | Booking permissions            | 5 min       |
| src/modules/sessions/sessions.controller.ts | Session permissions            | 3 min       |
| src/modules/lessons/lessons.controller.ts   | Lesson permissions             | 3 min       |
| PERMISSIONS.md                              | Permission matrix              | 5 min       |
| API_DOCUMENTATION.md                        | Error codes                    | 5 min       |

**Total Review Time**: 26 minutes

---

## Common Permission Patterns

### Pattern 1: Role Check

```typescript
// Only mentors can create lessons
router.post(
  "/",
  authenticateJWT,
  requireRole("mentor"),
  createLessonController,
);
```

### Pattern 2: Ownership Check

```typescript
// Verify parent owns student
const student = await getStudentById(studentId);
if (student.parent_id !== parentId) {
  return 403 Forbidden;
}
```

### Pattern 3: Resource Check

```typescript
// Verify lesson exists
const lesson = await getLessonById(lessonId);
if (!lesson) {
  return 404 Not Found;
}
```

### Pattern 4: Capacity Check

```typescript
// Check lesson capacity
const currentBookings = await getBookingCountForLesson(lessonId);
if (currentBookings >= lesson.capacity) {
  return 400 Capacity Exceeded;
}
```

### Pattern 5: Duplicate Prevention

```typescript
// Database constraint prevents duplicates
UNIQUE(student_id, lesson_id);
```

---

## Error Response Examples

### Insufficient Permissions (403)

```json
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

### Duplicate Booking (409)

```json
{
  "error": {
    "message": "Student is already booked for this lesson",
    "code": "DUPLICATE_BOOKING"
  }
}
```

### Capacity Exceeded (400)

```json
{
  "error": {
    "message": "Lesson capacity exceeded",
    "code": "CAPACITY_EXCEEDED"
  }
}
```

---

## Test Results

```
PASS  src/modules/auth/auth.controller.test.ts
PASS  src/modules/bookings/bookings.controller.test.ts
PASS  src/modules/sessions/sessions.controller.ts
PASS  src/modules/lessons/lessons.controller.test.ts
PASS  src/middleware/validation.test.ts
PASS  src/middleware/crossCuttingConcerns.test.ts
PASS  src/modules/llm/llm.test.ts
PASS  src/modules/llm/llm.integration.test.ts

Test Suites: 8 passed, 8 total
Tests:       98 passed, 98 total
Snapshots:   0 total
Time:        12.345s
```

---

## Approval Decision

### ✅ Approve If:

- All 98 tests pass
- Permission checks are verified
- No security vulnerabilities
- Documentation is complete
- Manual tests pass

### ❌ Request Changes If:

- Tests fail
- Permission checks missing
- Security issues found
- Documentation incomplete
- Manual tests fail

---

## Next Steps

1. **Quick Review** (15 min):
   - Read PERMISSIONS.md
   - Review key code files
   - Run tests

2. **Full Review** (30 min):
   - Read all documentation
   - Review all code
   - Run manual tests

3. **Decision**:
   - Approve ✅
   - Approve with comments
   - Request changes

---

## Resources

- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - Full documentation guide
- [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) - Detailed review checklist
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Manual testing guide
- [PERMISSIONS.md](./PERMISSIONS.md) - Permission matrix
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference

---

## Questions?

1. Check [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for navigation
2. Review [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) for detailed checklist
3. See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing help
4. Contact development team

---

**Ready to Review?** Start with [PERMISSIONS.md](./PERMISSIONS.md) → [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) → Run Tests

**Estimated Total Review Time**: 30-45 minutes
