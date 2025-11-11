#!/bin/bash

# Comprehensive E2E Test Execution Script
# This script runs all e2e tests created by PR29 in a thorough manner

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
TEST_START_TIME=$(date +%s)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print header
print_header() {
    echo ""
    echo "=========================================="
    echo "  COMPREHENSIVE E2E TEST EXECUTION"
    echo "  Testing suite created by PR29"
    echo "=========================================="
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    log_success "All prerequisites are available"
}

# Setup environment
setup_environment() {
    log_info "Setting up test environment..."
    
    # Create test results directory
    mkdir -p test-results
    
    # Check if backend dependencies are installed
    if [ ! -d "ticketing-suite/ticketing/node_modules" ]; then
        log_info "Installing backend dependencies..."
        cd ticketing-suite/ticketing
        npm install
        cd ../..
    fi
    
    # Check if frontend dependencies are installed
    if [ ! -d "ticketing-suite/ticketing-dashboard/node_modules" ]; then
        log_info "Installing frontend dependencies..."
        cd ticketing-suite/ticketing-dashboard
        npm install
        cd ../..
    fi
    
    # Check if e2e test dependencies are installed
    if [ ! -d "e2e-tests/node_modules" ]; then
        log_info "Installing e2e test dependencies..."
        cd e2e-tests
        npm install
        cd ..
    fi
    
    log_success "Environment setup complete"
}

# Start services with Docker Compose
start_services() {
    log_info "Starting services with Docker Compose..."
    
    cd ticketing-suite
    
    # Stop any existing containers
    docker-compose down -v || true
    
    # Start services
    log_info "Building and starting containers..."
    docker-compose up -d --build
    
    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Services failed to start"
        docker-compose logs
        exit 1
    fi
    
    # Run database migrations and seed
    log_info "Running database migrations and seeding..."
    docker-compose exec -T ticketing npm run prisma:deploy || log_warning "Migration already applied"
    docker-compose exec -T ticketing npm run seed:test || log_warning "Seed data may already exist"
    
    cd ..
    log_success "All services are running"
}

# Run backend E2E tests
run_backend_tests() {
    log_info "Running backend E2E tests (31 tests)..."
    echo ""
    
    cd ticketing-suite/ticketing
    
    if npm run test:e2e 2>&1 | tee ../../test-results/backend-e2e.log; then
        BACKEND_TESTS_PASSED=true
        log_success "Backend E2E tests PASSED"
    else
        log_error "Backend E2E tests FAILED"
        BACKEND_TESTS_PASSED=false
    fi
    
    cd ../..
}

# Install Playwright browsers
install_playwright() {
    log_info "Installing Playwright browsers..."
    
    cd e2e-tests
    
    if npx playwright install chromium --with-deps; then
        log_success "Playwright browsers installed"
    else
        log_warning "Could not install Playwright browsers. Trying without system deps..."
        npx playwright install chromium || log_error "Failed to install Playwright browsers"
    fi
    
    cd ..
}

# Run frontend E2E tests
run_frontend_tests() {
    log_info "Running frontend E2E tests (85 tests)..."
    echo ""
    
    # Ensure Playwright is installed
    if [ ! -d "e2e-tests/node_modules/@playwright" ]; then
        log_error "Playwright not installed. Run: cd e2e-tests && npm install"
        return 1
    fi
    
    cd e2e-tests
    
    # Run tests with different configurations
    log_info "Running comprehensive test suite..."
    
    if npm test 2>&1 | tee ../test-results/frontend-e2e.log; then
        FRONTEND_TESTS_PASSED=true
        log_success "Frontend E2E tests PASSED"
    else
        log_error "Frontend E2E tests FAILED"
        FRONTEND_TESTS_PASSED=false
    fi
    
    cd ..
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    cd ticketing-suite
    docker-compose down
    cd ..
    
    log_success "Services stopped"
}

# Generate test report
generate_report() {
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - TEST_START_TIME))
    local REPORT_FILE="test-results/TEST_EXECUTION_REPORT.md"
    
    log_info "Generating test execution report..."
    
    cat > "$REPORT_FILE" << EOF
# E2E Test Execution Report

**Execution Date:** $(date)
**Duration:** ${DURATION} seconds

## Test Summary

| Test Suite | Status | Test Count |
|------------|--------|------------|
| Backend E2E Tests | $([ "$BACKEND_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") | 31 |
| Frontend E2E Tests | $([ "$FRONTEND_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED") | 85 |

**Total Tests:** 116 E2E tests

## Test Coverage

### Backend Tests (31 tests)
- Health Checks (1 test)
- Directory Module (4 tests)
- Tickets Module (11 tests)
- Comments Module (4 tests)
- Attachments Module (4 tests)
- Multi-tenancy Isolation (3 tests)
- Authentication & Authorization (4 tests)

### Frontend Tests (85 tests)
- Core Functionality (31 tests in comprehensive.spec.ts)
  - Authentication & Authorization
  - Dashboard & Ticket List
  - Ticket Details & Editing
  - Search & Filtering
  - Prioritization Configuration
  - Error Handling & Edge Cases
  - Performance & UX
  - Complete User Flows
  - Accessibility & UI

- Extended Dashboard Features (46 tests in dashboard-features.spec.ts)
  - Create Ticket Modal
  - Bulk Operations
  - Advanced Search
  - Saved Views
  - Quick View Panel
  - Comments Management
  - Export Functionality
  - Keyboard Shortcuts
  - Sorting & Column Management
  - Dashboard Statistics
  - User Interface Elements
  - Error Boundaries & Recovery
  - Responsive Design
  - Data Persistence
  - Complete Integration Workflows

- Basic Flow Tests (8 tests in main-flows.spec.ts)
  - Sign-in flow
  - Dashboard view
  - View ticket detail
  - Edit ticket
  - Search and filter
  - Prioritization config
  - Logout flow
  - Error documentation

## Test Environment

- **Backend API:** Running on http://localhost:3000
- **Frontend Dashboard:** Running on http://localhost:5173
- **Database:** PostgreSQL 16 (Docker)
- **Cache:** Redis 7 (Docker)
- **Search:** OpenSearch 2.11 (Docker)

## Detailed Results

### Backend E2E Test Results
\`\`\`
$(cat test-results/backend-e2e.log 2>/dev/null || echo "Log file not available")
\`\`\`

### Frontend E2E Test Results
\`\`\`
$(cat test-results/frontend-e2e.log 2>/dev/null || echo "Log file not available")
\`\`\`

## Overall Result

$(if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ]; then
    echo "✅ **ALL TESTS PASSED** - The application is functioning correctly across all tested scenarios."
elif [ "$BACKEND_TESTS_PASSED" = true ] || [ "$FRONTEND_TESTS_PASSED" = true ]; then
    echo "⚠️ **PARTIAL SUCCESS** - Some test suites passed, but others failed. Review the detailed logs above."
else
    echo "❌ **TESTS FAILED** - Issues were detected. Review the detailed logs above for specific failures."
fi)

## Next Steps

$(if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ]; then
    echo "1. Review test coverage to ensure all features are adequately tested"
    echo "2. Consider adding additional edge case tests"
    echo "3. Set up CI/CD pipeline to run these tests automatically"
else
    echo "1. Review failed test logs above to identify issues"
    echo "2. Fix the identified bugs or test configuration issues"
    echo "3. Re-run tests to verify fixes"
fi)

---
*Generated by run-e2e-tests.sh - Comprehensive E2E Testing Script*
EOF

    log_success "Test report generated: $REPORT_FILE"
    echo ""
    cat "$REPORT_FILE"
}

# Main execution
main() {
    print_header
    
    # Check if we should skip service startup (for CI environments)
    if [ "$SKIP_SERVICE_STARTUP" != "true" ]; then
        check_prerequisites
        setup_environment
        start_services
    else
        log_info "Skipping service startup (SKIP_SERVICE_STARTUP=true)"
    fi
    
    # Run tests
    if [ "$SKIP_BACKEND_TESTS" != "true" ]; then
        run_backend_tests
    else
        log_info "Skipping backend tests (SKIP_BACKEND_TESTS=true)"
    fi
    
    if [ "$SKIP_FRONTEND_TESTS" != "true" ]; then
        # Try to install Playwright if not already installed
        if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "e2e-tests/node_modules/@playwright/test" ]; then
            install_playwright || log_warning "Could not install Playwright. Frontend tests may fail."
        fi
        run_frontend_tests
    else
        log_info "Skipping frontend tests (SKIP_FRONTEND_TESTS=true)"
    fi
    
    # Stop services if we started them
    if [ "$SKIP_SERVICE_STARTUP" != "true" ] && [ "$KEEP_SERVICES_RUNNING" != "true" ]; then
        stop_services
    fi
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ]; then
        log_success "All tests completed successfully!"
        exit 0
    else
        log_error "Some tests failed. Check the report for details."
        exit 1
    fi
}

# Run main function
main "$@"
