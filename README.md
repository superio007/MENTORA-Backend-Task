# Mentorship Platform Backend

A comprehensive REST API for managing mentorship relationships, lesson bookings, and session scheduling. Built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Three User Roles**: Parent, Student, and Mentor with distinct permissions
- **Student Management**: Parents can create and manage student accounts
- **Lesson Management**: Mentors can create lessons with capacity limits
- **Booking System**: Parents can book students into lessons with duplicate prevention
- **Session Scheduling**: Mentors can schedule and manage lesson sessions
- **LLM Integration**: AI-powered text summarization with rate limiting
- **Comprehensive Security**: Helmet middleware, CORS, input validation, and sensitive data redaction
- **Structured Logging**: JSON logging with automatic sensitive data redaction
- **Rate Limiting**: Per-user rate limiting on expensive endpoints
- **Database Constraints**: Foreign keys, unique constraints, and check constraints for data integrity
- **Pagination Support**: Efficient list endpoints with pagination metadata

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Logging**: Winston
- **Rate Limiting**: express-rate-limit
- **Testing**: Jest, fast-check (property-based testing)

## Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Installation

1. **Clone the repository**:

```bash
git clone [<repository-url>](https://github.com/superio007/MENTORA-Backend-Task.git)
cd mentorship-platform-backend
```

2. **Install dependencies**:

```bash
npm install
```

3. **Configure environment variables**:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mentorship_platform
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_at_least_32_characters_long
JWT_EXPIRATION=24h

# LLM Service
LLM_API_KEY=your_llm_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-3.5-turbo
LLM_TIMEOUT_MS=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# CORS
CORS_ORIGIN=http://localhost:3000

# Request Size Limits
REQUEST_SIZE_LIMIT=10mb
LLM_REQUEST_SIZE_LIMIT=50kb
```

4. **Set up the database**:

Create the database:

```bash
createdb mentorship_platform
```

Run migrations:

```bash
npm run migrate
```

5. **Start the server**:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
src/
├── modules/
│   ├── auth/              # Authentication module
│   ├── students/          # Student management
│   ├── lessons/           # Lesson management
│   ├── bookings/          # Booking management
│   ├── sessions/          # Session management
│   └── llm/               # LLM integration
├── middleware/
│   ├── errorHandler.ts    # Centralized error handling
│   ├── rateLimiter.ts     # Rate limiting
│   ├── requestLogger.ts   # Request logging
│   ├── security.ts        # Security headers, CORS
│   └── validation.ts      # Input validation
├── config/
│   ├── database.ts        # Database configuration
│   ├── env.ts             # Environment variables
│   └── jwt.ts             # JWT configuration
├── utils/
│   └── logger.ts          # Logging utility
├── app.ts                 # Express app setup
└── index.ts               # Server entry point
```

## API Documentation

### Documentation Index

Start with **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** for a complete guide to all documentation files and reading paths by role.

### Main Documentation Files

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference with:
  - Authentication and JWT tokens
  - All endpoint specifications with examples
  - Error handling and status codes
  - Rate limiting policies
  - Comprehensive testing guide with test cases
  - Environment variable configuration

- **[PERMISSIONS.md](./PERMISSIONS.md)** - Permission & authorization guide with:
  - Role-based access control matrix
  - Detailed permission rules for each operation
  - Permission enforcement points
  - Testing checklist
  - Common scenarios and examples
  - Security notes

- **[REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md)** - For code reviewers with:
  - Review checklist for all features
  - Testing workflow
  - Approval criteria
  - Common issues and solutions

## Authentication

### User Roles & Permissions

The system implements role-based access control with three distinct roles:

**Parent**

- Create and manage student accounts
- Book students into lessons
- View and cancel bookings for their students
- View public lessons

**Mentor**

- Create and manage lessons
- Create and manage sessions for their lessons
- View and cancel bookings for their lessons
- View public lessons

**Student**

- View public lessons
- View their own bookings

For detailed permission matrix and authorization rules, see [PERMISSIONS.md](./PERMISSIONS.md).

### Obtaining a Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:

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

### Using the Token

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/students
```

## Testing

The project includes comprehensive test coverage with unit tests and property-based tests.

### Test Coverage

- **72 unit tests** covering all modules and endpoints
- **26 property-based tests** for edge cases and invariants
- **Total: 98 tests, all passing**

### Running Tests

```bash
# Run all tests
npm test -- --run

# Run tests in watch mode
npm test

# Run specific test file
npm test -- src/modules/auth/auth.controller.test.ts

# Run with coverage
npm test -- --coverage
```

### Testing Documentation

For comprehensive testing instructions:

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete manual testing guide with:
  - Setup instructions for test data
  - 21 detailed test scenarios
  - Permission-based test cases
  - Automated testing with Postman
  - Troubleshooting guide

- **[API_DOCUMENTATION.md - Testing Guide](./API_DOCUMENTATION.md#testing-guide)** - Quick reference for:
  - Test scenarios by feature
  - Example curl commands
  - Expected responses
  - Error cases

### Test Scenarios

The API includes test scenarios for:

- ✅ Authentication (login, token validation, expiration)
- ✅ Booking permissions (create, view, delete with ownership checks)
- ✅ Session permissions (create, view, update, delete)
- ✅ Lesson permissions (create, view, update, delete)
- ✅ Student permissions (create, view, update, delete)
- ✅ Capacity management and duplicate prevention
- ✅ Role-based access control
- ✅ Data isolation between users

**Postman Collection**: Import `Mentorship-Platform-API-v2.postman_collection.json` for pre-configured test requests.

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'student', 'mentor')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Students Table

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Lessons Table

```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, lesson_id)
);
```

## Security Features

1. **Password Hashing**: bcrypt with cost factor 10
2. **JWT Authentication**: Stateless token-based authentication
3. **Role-Based Access Control**: Three distinct roles with specific permissions
4. **Input Validation**: Zod schemas validate all inputs
5. **Rate Limiting**: Per-user rate limiting on expensive endpoints
6. **Security Headers**: Helmet middleware sets security headers
7. **CORS Protection**: Configurable CORS origins
8. **Sensitive Data Redaction**: Passwords, tokens, and API keys never logged
9. **Database Constraints**: Foreign keys, unique constraints, check constraints
10. **Error Handling**: Consistent error responses without exposing internal details

## Performance Considerations

- **Connection Pooling**: PostgreSQL connection pool with max 20 connections
- **Database Indexes**: Indexes on frequently queried columns (email, parent_id, mentor_id, etc.)
- **Pagination**: List endpoints support pagination to handle large datasets
- **Rate Limiting**: Prevents abuse and excessive resource consumption
- **Structured Logging**: JSON logging for efficient log processing

## Deployment

### Reviewer Checklist

Before approving this API for production, verify:

**Authentication & Authorization**

- [ ] JWT tokens are properly validated
- [ ] Role-based access control is enforced
- [ ] Users can only access their own resources
- [ ] All permission checks are in place (see [PERMISSIONS.md](./PERMISSIONS.md))

**Booking System**

- [ ] Parents can only book their own students
- [ ] Lesson capacity limits are enforced
- [ ] Duplicate bookings are prevented
- [ ] Bookings can be cancelled by parent or mentor

**Session Management**

- [ ] Only mentors can create sessions
- [ ] Mentors can only manage their own sessions
- [ ] Sessions are properly linked to lessons

**Lesson Management**

- [ ] Only mentors can create lessons
- [ ] Mentors can only update/delete their own lessons
- [ ] Lessons are publicly viewable
- [ ] Capacity constraints are enforced

**Data Integrity**

- [ ] Foreign key constraints are in place
- [ ] Unique constraints prevent duplicates
- [ ] Check constraints validate data ranges
- [ ] Cascading deletes work correctly

**Error Handling**

- [ ] All endpoints return appropriate HTTP status codes
- [ ] Error messages don't expose sensitive information
- [ ] Validation errors are clear and actionable
- [ ] Rate limiting returns 429 status

**Security**

- [ ] Passwords are hashed with bcrypt
- [ ] Sensitive data is never logged
- [ ] CORS is properly configured
- [ ] Security headers are set (Helmet)
- [ ] Input validation prevents injection attacks

**Testing**

- [ ] All 98 tests pass
- [ ] Permission tests cover all scenarios
- [ ] Edge cases are tested
- [ ] Integration tests verify workflows

**Documentation**

- [ ] API endpoints are documented
- [ ] Permission rules are clear
- [ ] Error codes are explained
- [ ] Examples are provided

For detailed testing instructions, see [API_DOCUMENTATION.md - Testing Guide](./API_DOCUMENTATION.md#testing-guide).

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (min 32 characters)
- [ ] Configure `CORS_ORIGIN` for your domain
- [ ] Use HTTPS for all connections
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review security headers configuration
- [ ] Test rate limiting configuration
- [ ] Set up log aggregation
- [ ] Configure database connection pooling

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t mentorship-api .
docker run -p 3000:3000 --env-file .env mentorship-api
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U postgres -d mentorship_platform
```

### Port Already in Use

```bash
# Change PORT in .env or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### JWT Token Errors

- Ensure `JWT_SECRET` is at least 32 characters
- Check token expiration with `JWT_EXPIRATION`
- Verify token format in Authorization header: `Bearer <token>`

### LLM Service Errors

- Verify `LLM_API_KEY` is valid
- Check `LLM_API_URL` is correct
- Ensure `LLM_TIMEOUT_MS` is sufficient (default 30000ms)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on the project repository.

## Changelog

### Version 1.0.0 (Initial Release)

- Complete REST API implementation
- JWT authentication with role-based access control
- Student, lesson, booking, and session management
- LLM text summarization integration
- Comprehensive test coverage (98 tests)
- Production-ready security features
- Structured logging and error handling
- Rate limiting and pagination support
