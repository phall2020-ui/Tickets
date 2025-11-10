# Comprehensive E2E Test Execution Guide

This guide explains how to conduct thorough end-to-end testing using the comprehensive test suite created by PR29.

## Overview

PR29 created a comprehensive test suite with **116 E2E tests** covering:
- 31 backend API tests
- 85 frontend dashboard tests

This guide helps you execute these tests thoroughly to validate the entire system.

## Quick Start

### Automated Testing (Recommended)

Run all tests with a single command:

```bash
./run-e2e-tests.sh
```

This script will:
1. Check prerequisites (Docker, Node.js)
2. Install dependencies
3. Start all services with Docker Compose
4. Run backend E2E tests (31 tests)
5. Run frontend E2E tests (85 tests)
6. Generate a comprehensive test report
7. Clean up services

### Manual Testing

If you prefer to run tests manually or need more control:

#### Step 1: Start Services

```bash
cd ticketing-suite
docker-compose up -d --build

# Wait for services to be ready (30-60 seconds)
sleep 30

# Run migrations and seed test data
docker-compose exec ticketing npm run prisma:deploy
docker-compose exec ticketing npm run seed:test
```

#### Step 2: Run Backend Tests

```bash
cd ticketing-suite/ticketing
npm install  # if not already done
npm run test:e2e
```

#### Step 3: Run Frontend Tests

```bash
# Install Playwright browsers (one-time setup)
cd ../../e2e-tests
npm install
npx playwright install chromium --with-deps

# Run tests
npm test
```

#### Step 4: Stop Services

```bash
cd ../ticketing-suite
docker-compose down
```

## Test Suite Details

### Backend E2E Tests (31 tests)

**Location:** `ticketing-suite/ticketing/test/app.e2e-spec.ts`

**Coverage:**
- ✅ Health checks (1 test)
- ✅ Directory module - sites, users, issue types (4 tests)
- ✅ Tickets CRUD - create, read, update, delete (11 tests)
- ✅ Comments - create and list (4 tests)
- ✅ Attachments - presign and finalize (4 tests)
- ✅ Multi-tenancy isolation (3 tests)
- ✅ Authentication & authorization (4 tests)

**Technology:** Jest + Supertest

### Frontend E2E Tests (85 tests)

**Location:** `e2e-tests/tests/`

**Files:**
1. **comprehensive.spec.ts** (31 tests) - Core functionality
   - Authentication & authorization
   - Dashboard & ticket list
   - Ticket details & editing
   - Search & filtering
   - Prioritization configuration
   - Error handling & edge cases
   - Performance & UX
   - Complete user flows
   - Accessibility & UI

2. **dashboard-features.spec.ts** (46 tests) - Extended features
   - Create ticket modal (4 tests)
   - Bulk operations (4 tests)
   - Advanced search (3 tests)
   - Saved views (3 tests)
   - Quick view panel (4 tests)
   - Comments management (5 tests)
   - Export functionality (2 tests)
   - Keyboard shortcuts (2 tests)
   - Sorting & column management (2 tests)
   - Dashboard statistics (3 tests)
   - User interface elements (4 tests)
   - Error boundaries & recovery (3 tests)
   - Responsive design (3 tests)
   - Data persistence (2 tests)
   - Complete integration workflows (2 tests)

3. **main-flows.spec.ts** (8 tests) - Basic flows
   - Sign-in/sign-out flows
   - Dashboard viewing
   - Ticket detail viewing
   - Ticket editing
   - Search and filtering
   - Configuration management

**Technology:** Playwright

## Test Configuration

### Environment Variables

Create a `.env` file in `ticketing-suite/ticketing/` if using custom configuration:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing?schema=public
REDIS_URL=redis://localhost:6379
OPENSEARCH_NODE=http://localhost:9200
```

### Script Options

The `run-e2e-tests.sh` script supports several environment variables:

```bash
# Skip service startup (if services are already running)
SKIP_SERVICE_STARTUP=true ./run-e2e-tests.sh

# Skip backend tests
SKIP_BACKEND_TESTS=true ./run-e2e-tests.sh

# Skip frontend tests
SKIP_FRONTEND_TESTS=true ./run-e2e-tests.sh

# Keep services running after tests
KEEP_SERVICES_RUNNING=true ./run-e2e-tests.sh
```

## Test Reports

After running tests, you'll find:

1. **Test Execution Report:** `test-results/TEST_EXECUTION_REPORT.md`
   - Summary of all test results
   - Pass/fail status for each suite
   - Execution duration
   - Detailed logs

2. **Backend Test Logs:** `test-results/backend-e2e.log`
3. **Frontend Test Logs:** `test-results/frontend-e2e.log`
4. **Playwright HTML Report:** `e2e-tests/playwright-report/index.html`

View the Playwright HTML report:
```bash
cd e2e-tests
npx playwright show-report
```

## Continuous Integration

### GitHub Actions

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run E2E Tests
        run: |
          chmod +x ./run-e2e-tests.sh
          ./run-e2e-tests.sh
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
      
      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: e2e-tests/playwright-report/
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# View logs
cd ticketing-suite
docker-compose logs

# Clean up and restart
docker-compose down -v
docker-compose up -d --build
```

### Backend Tests Fail

```bash
# Check database connection
cd ticketing-suite/ticketing
npm run prisma:deploy

# Check if backend is running
curl http://localhost:3000/health

# View backend logs
cd ../
docker-compose logs ticketing
```

### Frontend Tests Fail

```bash
# Check if frontend is accessible
curl http://localhost:5173

# Reinstall Playwright browsers
cd e2e-tests
npx playwright install chromium --with-deps

# Run tests in headed mode to see what's happening
npm run test:headed

# Run tests in debug mode
npm run test:debug
```

### Playwright Installation Issues

If Playwright browser installation fails:

```bash
# Try without system dependencies
npx playwright install chromium

# Or use Docker to run Playwright
docker run --rm --network host -v $(pwd):/work/ -w /work/ mcr.microsoft.com/playwright:v1.48.0-jammy npm test
```

## Best Practices

1. **Run tests regularly** - Run the full test suite before merging PRs
2. **Review test logs** - Always check logs even when tests pass
3. **Keep tests updated** - Update tests when features change
4. **Monitor performance** - Track test execution time
5. **Fix flaky tests** - Address intermittent failures immediately
6. **Use CI/CD** - Automate test execution in your pipeline

## Advanced Testing

### Run Specific Test Files

```bash
# Backend - specific test file
cd ticketing-suite/ticketing
npm run test:e2e -- app.e2e-spec.ts

# Frontend - specific test file
cd e2e-tests
npx playwright test comprehensive.spec.ts
```

### Run Tests in Different Browsers

```bash
cd e2e-tests
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Generate Test Coverage

```bash
# Backend
cd ticketing-suite/ticketing
npm run test:e2e -- --coverage

# Frontend (requires additional configuration)
cd e2e-tests
npx playwright test --reporter=html
```

### Debug Failing Tests

```bash
# Backend - with verbose output
cd ticketing-suite/ticketing
npm run test:e2e -- --verbose

# Frontend - with UI mode
cd e2e-tests
npx playwright test --ui
```

## Test Data

The test suite uses seeded data created by `npm run seed:test`:

- **Tenant:** test-tenant-001 (Acme Corporation)
- **Users:** admin@acme.com, john@acme.com, sarah@acme.com, etc.
- **Default Password:** password123
- **Sites:** 5 locations (Headquarters, West Coast, etc.)
- **Issue Types:** 8 types (Bug Report, Feature Request, etc.)
- **Tickets:** 15 diverse tickets with various statuses

## Support

For issues or questions:
1. Check the [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing information
2. Review [DASHBOARD_TEST_COVERAGE.md](./DASHBOARD_TEST_COVERAGE.md) for test details
3. Check Docker logs: `cd ticketing-suite && docker-compose logs`
4. Review test output in `test-results/` directory

## Summary

This comprehensive testing approach ensures:
- ✅ All API endpoints work correctly
- ✅ All dashboard features function as expected
- ✅ User workflows are validated end-to-end
- ✅ Multi-tenancy isolation is maintained
- ✅ Authentication and authorization work properly
- ✅ Error handling is robust
- ✅ Performance meets expectations

Running these tests thoroughly validates the entire ticketing system from backend to frontend.
