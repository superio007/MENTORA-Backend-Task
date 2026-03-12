# Permission & Authorization Guide

## Quick Reference

### User Roles

| Role        | Purpose                       | Key Permissions                                                |
| ----------- | ----------------------------- | -------------------------------------------------------------- |
| **Parent**  | Manages students and bookings | Create/manage students, book lessons, cancel bookings          |
| **Mentor**  | Creates and manages lessons   | Create/manage lessons, create/manage sessions, cancel bookings |
| **Student** | Participates in lessons       | View lessons, view own bookings                                |

---

## Detailed Permission Matrix

### Student Management

| Operation      | Parent | Mentor | Student |
| -------------- | ------ | ------ | ------- |
| Create Student | ✅ Own | ❌     | ❌      |
| View Students  | ✅ Own | ✅ All | ❌      |
| Update Student | ✅ Own | ❌     | ❌      |
| Delete Student | ✅ Own | ❌     | ❌      |

**Ownership Rule**: Parent owns students they create

---

### Lesson Management

| Operation     | Parent    | Mentor    | Student   |
| ------------- | --------- | --------- | --------- |
| Create Lesson | ❌        | ✅        | ❌        |
| View Lessons  | ✅ Public | ✅ Public | ✅ Public |
| Update Lesson | ❌        | ✅ Own    | ❌        |
| Delete Lesson | ❌        | ✅ Own    | ❌        |

**Ownership Rule**: Mentor owns lessons they create
**Public Access**: All lessons are publicly viewable

---

### Booking Management

| Operation      | Parent          | Mentor         | Student |
| -------------- | --------------- | -------------- | ------- |
| Create Booking | ✅              | ❌             | ❌      |
| View Bookings  | ✅ Own Students | ✅ Own Lessons | ✅ Own  |
| Delete Booking | ✅ Own Students | ✅ Own Lessons | ❌      |

**Ownership Rules**:

- Parent can only book their own students
- Parent can only view/delete bookings for their students
- Mentor can only view/delete bookings for their lessons

**Constraints**:

- Lesson must have available capacity
- Student cannot be booked twice for same lesson
- Student must exist and belong to parent

---

### Session Management

| Operation      | Parent    | Mentor         | Student   |
| -------------- | --------- | -------------- | --------- |
| Create Session | ❌        | ✅             | ❌        |
| View Sessions  | ✅ Public | ✅ Own Lessons | ✅ Public |
| Update Session | ❌        | ✅ Own         | ❌        |
| Delete Session | ❌        | ✅ Own         | ❌        |

**Ownership Rule**: Mentor can only manage sessions for their own lessons
**Public Access**: Session details are publicly viewable

---

## Permission Enforcement Points

### 1. Booking Creation

```
POST /bookings
├─ Authentication: Required (JWT)
├─ Authorization: Parent role only
├─ Ownership Check: Parent must own the student
├─ Resource Check: Lesson must exist
├─ Capacity Check: Lesson must have available slots
└─ Uniqueness Check: Student cannot already be booked
```

**Possible Errors**:

- `401 Unauthorized` - No token or invalid token
- `403 Forbidden` - Not a parent OR parent doesn't own student
- `404 Not Found` - Student or lesson doesn't exist
- `400 Bad Request` - Lesson capacity exceeded
- `409 Conflict` - Duplicate booking exists

---

### 2. Session Creation

```
POST /sessions
├─ Authentication: Required (JWT)
├─ Authorization: Mentor role only
├─ Ownership Check: Mentor must own the lesson
└─ Resource Check: Lesson must exist
```

**Possible Errors**:

- `401 Unauthorized` - No token or invalid token
- `403 Forbidden` - Not a mentor OR mentor doesn't own lesson
- `404 Not Found` - Lesson doesn't exist
- `400 Bad Request` - Invalid duration

---

### 3. Lesson Creation

```
POST /lessons
├─ Authentication: Required (JWT)
└─ Authorization: Mentor role only
```

**Possible Errors**:

- `401 Unauthorized` - No token or invalid token
- `403 Forbidden` - Not a mentor
- `400 Bad Request` - Invalid capacity

---

### 4. Booking View

```
GET /bookings
├─ Authentication: Required (JWT)
└─ Role-Based Filtering:
    ├─ Parent: Returns bookings for their students
    ├─ Mentor: Returns bookings for their lessons
    └─ Student: Returns their own bookings
```

---

### 5. Session View

```
GET /sessions
├─ Authentication: Required (JWT)
├─ Authorization: Mentor role only
└─ Filtering: Returns only sessions for mentor's lessons
```

---

## Testing Checklist

### ✅ Booking Permissions

- [ ] Parent can create booking for own student
- [ ] Parent cannot create booking for other parent's student
- [ ] Mentor cannot create booking
- [ ] Student cannot create booking
- [ ] Duplicate bookings are prevented
- [ ] Capacity limits are enforced
- [ ] Parent can view own bookings
- [ ] Mentor can view bookings for own lessons
- [ ] Parent can delete own booking
- [ ] Mentor can delete booking for own lesson
- [ ] Parent cannot delete other parent's booking

### ✅ Session Permissions

- [ ] Mentor can create session for own lesson
- [ ] Mentor cannot create session for other mentor's lesson
- [ ] Parent cannot create session
- [ ] Student cannot create session
- [ ] Mentor can view own sessions
- [ ] Parent cannot view sessions (403)
- [ ] Student cannot view sessions (403)
- [ ] Mentor can update own session
- [ ] Mentor cannot update other mentor's session
- [ ] Mentor can delete own session
- [ ] Mentor cannot delete other mentor's session

### ✅ Lesson Permissions

- [ ] Mentor can create lesson
- [ ] Parent cannot create lesson
- [ ] Student cannot create lesson
- [ ] Anyone can view lessons (public)
- [ ] Mentor can update own lesson
- [ ] Mentor cannot update other mentor's lesson
- [ ] Mentor can delete own lesson
- [ ] Mentor cannot delete other mentor's lesson

### ✅ Student Permissions

- [ ] Parent can create student
- [ ] Parent can view own students
- [ ] Parent cannot view other parent's students
- [ ] Mentor can view all students
- [ ] Student cannot create student
- [ ] Parent can update own student
- [ ] Parent cannot update other parent's student
- [ ] Parent can delete own student
- [ ] Parent cannot delete other parent's student

---

## Common Scenarios

### Scenario 1: Parent Books Lesson for Student

```
1. Parent logs in → Gets JWT token
2. Parent creates student → Student belongs to parent
3. Mentor creates lesson → Lesson belongs to mentor
4. Parent books student into lesson
   ✅ Success: Parent owns student, lesson exists, capacity available
   ❌ Fails: Parent doesn't own student, lesson full, duplicate booking
```

### Scenario 2: Mentor Schedules Session

```
1. Mentor logs in → Gets JWT token
2. Mentor creates lesson → Lesson belongs to mentor
3. Mentor creates session for lesson
   ✅ Success: Mentor owns lesson
   ❌ Fails: Mentor doesn't own lesson, invalid duration
```

### Scenario 3: Mentor Cancels Booking

```
1. Mentor logs in → Gets JWT token
2. Mentor views bookings for own lessons
3. Mentor cancels booking
   ✅ Success: Booking is for mentor's lesson
   ❌ Fails: Booking is for other mentor's lesson
```

### Scenario 4: Parent Views Bookings

```
1. Parent logs in → Gets JWT token
2. Parent requests bookings
   ✅ Returns: Only bookings for parent's students
   ❌ Excludes: Bookings for other parents' students
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

**When**: User lacks required role or doesn't own resource

---

### Duplicate Booking (409)

```json
{
  "error": {
    "message": "Student is already booked for this lesson",
    "code": "DUPLICATE_BOOKING"
  }
}
```

**When**: Student already has booking for same lesson

---

### Capacity Exceeded (400)

```json
{
  "error": {
    "message": "Lesson capacity exceeded",
    "code": "CAPACITY_EXCEEDED"
  }
}
```

**When**: Lesson has reached maximum bookings

---

### Not Found (404)

```json
{
  "error": {
    "message": "Student not found",
    "code": "NOT_FOUND"
  }
}
```

**When**: Referenced resource doesn't exist

---

## Implementation Details

### Ownership Verification

All ownership checks follow this pattern:

```typescript
// Example: Verify parent owns student
const student = await getStudentById(studentId);
if (student.parent_id !== parentId) {
  return 403 Forbidden;
}
```

### Capacity Checking

```typescript
// Example: Check lesson capacity
const currentBookings = await getBookingCountForLesson(lessonId);
if (currentBookings >= lesson.capacity) {
  return 400 Capacity Exceeded;
}
```

### Duplicate Prevention

```typescript
// Example: Prevent duplicate bookings
// Database constraint: UNIQUE(student_id, lesson_id)
// Application check: Verify before creating
```

---

## Security Notes

1. **No Cross-Tenant Access**: Users can only access their own resources
2. **Role Enforcement**: Middleware enforces role requirements before business logic
3. **Ownership Verification**: All operations verify resource ownership
4. **Constraint Enforcement**: Database constraints prevent invalid states
5. **Audit Logging**: All permission checks are logged for security audits

---

## Support

For permission-related issues:

1. Check this guide for expected behavior
2. Review API_DOCUMENTATION.md for endpoint details
3. Check application logs for permission denial reasons
4. Contact development team with specific scenario
