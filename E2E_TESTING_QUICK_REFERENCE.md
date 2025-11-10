# E2E Testing Quick Reference

## Quick Start

```bash
# Run all tests (automated)
./run-e2e-tests.sh

# Validate configuration
./validate-test-config.sh
```

## Test Suite Summary

| Suite | Tests | Description |
|-------|-------|-------------|
| Backend E2E | 31 | API endpoints, multi-tenancy, auth |
| Frontend E2E | 85 | Dashboard features, workflows, UI |
| **Total** | **116** | Complete system validation |

## Common Commands

### Automated Testing

```bash
# Full test run
./run-e2e-tests.sh

# Skip service startup (if already running)
SKIP_SERVICE_STARTUP=true ./run-e2e-tests.sh

# Keep services running after tests
KEEP_SERVICES_RUNNING=true ./run-e2e-tests.sh

# Run only backend tests
SKIP_FRONTEND_TESTS=true ./run-e2e-tests.sh

# Run only frontend tests
SKIP_BACKEND_TESTS=true ./run-e2e-tests.sh
```

### Manual Testing

```bash
# Start services
cd ticketing-suite
docker-compose up -d --build

# Run backend tests
cd ticketing
npm run test:e2e

# Run frontend tests
cd ../../e2e-tests
npm install
npx playwright install chromium --with-deps
npm test

# View Playwright report
npx playwright show-report

# Stop services
cd ../ticketing-suite
docker-compose down
```

## Test Files

### Backend
- `ticketing-suite/ticketing/test/app.e2e-spec.ts` - Main E2E test suite
- `ticketing-suite/ticketing/jest.e2e.config.js` - Jest configuration

### Frontend
- `e2e-tests/tests/comprehensive.spec.ts` - Core functionality (31 tests)
- `e2e-tests/tests/dashboard-features.spec.ts` - Extended features (46 tests)
- `e2e-tests/tests/main-flows.spec.ts` - Basic flows (8 tests)
- `e2e-tests/playwright.config.ts` - Playwright configuration

## Test Reports

After running tests, find reports in:

```
test-results/
├── TEST_EXECUTION_REPORT.md    # Summary report
├── backend-e2e.log              # Backend test logs
└── frontend-e2e.log             # Frontend test logs

e2e-tests/
└── playwright-report/           # Interactive HTML report
    └── index.html
```

View Playwright report:
```bash
cd e2e-tests
npx playwright show-report
```

## Troubleshooting

### Services won't start
```bash
cd ticketing-suite
docker-compose down -v
docker-compose up -d --build
docker-compose logs
```

### Backend tests fail
```bash
cd ticketing-suite/ticketing
npm run prisma:deploy
curl http://localhost:3000/health
```

### Frontend tests fail
```bash
curl http://localhost:5173
cd e2e-tests
npx playwright install chromium --with-deps
npm run test:headed
```

### Playwright installation issues
```bash
# Try without system deps
npx playwright install chromium

# Or use Docker
docker run --rm --network host -v $(pwd):/work/ \
  -w /work/ mcr.microsoft.com/playwright:v1.48.0-jammy \
  npm test
```

## Test Coverage

### Backend (31 tests)
- Health checks (1)
- Directory module (4)
- Tickets CRUD (11)
- Comments (4)
- Attachments (4)
- Multi-tenancy (3)
- Authentication (4)

### Frontend (85 tests)
- Authentication & authorization (3)
- Dashboard & ticket list (3)
- Ticket details & editing (5)
- Search & filtering (4)
- Create ticket modal (4)
- Bulk operations (4)
- Comments management (5)
- Export functionality (2)
- Responsive design (3)
- And 52 more...

## Documentation

- **E2E_TEST_EXECUTION_GUIDE.md** - Comprehensive guide
- **THOROUGH_E2E_TESTING_IMPLEMENTATION.md** - Implementation details
- **TESTING_GUIDE.md** - General testing information
- **DASHBOARD_TEST_COVERAGE.md** - Detailed test breakdown
- **TEST_README.md** - Quick overview

## CI/CD

Tests run automatically via GitHub Actions:
- On push to main/develop
- On pull requests
- Can be triggered manually

View workflow: `.github/workflows/e2e-tests.yml`

## Environment Requirements

### Minimal
- Docker & Docker Compose
- Node.js 18+
- 4GB RAM
- 10GB disk space

### Services Started
- PostgreSQL 16
- Redis 7
- OpenSearch 2.11
- Backend API (port 3000)
- Frontend Dashboard (port 5173)

## Test Data

The test suite uses seeded data:
- **Tenant:** test-tenant-001 (Acme Corporation)
- **Admin:** admin@acme.com / password123
- **Users:** john@acme.com, sarah@acme.com, etc. / password123
- **Sites:** 5 locations
- **Issue Types:** 8 types
- **Tickets:** 15 sample tickets

## Best Practices

1. ✅ Run tests before committing
2. ✅ Review test reports even when passing
3. ✅ Fix failing tests immediately
4. ✅ Update tests when features change
5. ✅ Use CI/CD for automated testing
6. ✅ Keep services clean (docker-compose down -v)

## Support

For detailed information, see:
- `E2E_TEST_EXECUTION_GUIDE.md`
- GitHub Issues
- Test output logs

---
*Quick reference for E2E testing - See full documentation for details*
