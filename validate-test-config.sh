#!/bin/bash

# Test Configuration Validator
# Validates that all tests are properly configured and can be run

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

VALIDATION_PASSED=true

echo "=========================================="
echo "  E2E Test Configuration Validator"
echo "=========================================="
echo ""

# Check backend test configuration
log_info "Validating backend test configuration..."

if [ -f "ticketing-suite/ticketing/test/app.e2e-spec.ts" ]; then
    log_success "Backend E2E test file exists"
    
    # Count test cases
    TEST_COUNT=$(grep -c "it('should\|test('should" ticketing-suite/ticketing/test/app.e2e-spec.ts || echo "0")
    log_info "Found approximately $TEST_COUNT backend test cases"
else
    log_error "Backend E2E test file not found"
    VALIDATION_PASSED=false
fi

if [ -f "ticketing-suite/ticketing/jest.e2e.config.js" ]; then
    log_success "Backend E2E Jest config exists"
else
    log_error "Backend E2E Jest config not found"
    VALIDATION_PASSED=false
fi

if [ -f "ticketing-suite/ticketing/package.json" ]; then
    if grep -q "test:e2e" ticketing-suite/ticketing/package.json; then
        log_success "Backend test:e2e script is configured"
    else
        log_error "Backend test:e2e script not found in package.json"
        VALIDATION_PASSED=false
    fi
else
    log_error "Backend package.json not found"
    VALIDATION_PASSED=false
fi

echo ""
log_info "Validating frontend test configuration..."

if [ -f "e2e-tests/playwright.config.ts" ]; then
    log_success "Playwright config exists"
else
    log_error "Playwright config not found"
    VALIDATION_PASSED=false
fi

# Check test files
FRONTEND_TESTS=0
if [ -f "e2e-tests/tests/comprehensive.spec.ts" ]; then
    log_success "Frontend comprehensive test file exists"
    COUNT=$(grep -c "test('should\|test.only('should\|test.skip('should" e2e-tests/tests/comprehensive.spec.ts || echo "0")
    log_info "  - comprehensive.spec.ts: ~$COUNT tests"
    FRONTEND_TESTS=$((FRONTEND_TESTS + COUNT))
else
    log_error "Frontend comprehensive test file not found"
    VALIDATION_PASSED=false
fi

if [ -f "e2e-tests/tests/dashboard-features.spec.ts" ]; then
    log_success "Frontend dashboard-features test file exists"
    COUNT=$(grep -c "test('should\|test.only('should\|test.skip('should" e2e-tests/tests/dashboard-features.spec.ts || echo "0")
    log_info "  - dashboard-features.spec.ts: ~$COUNT tests"
    FRONTEND_TESTS=$((FRONTEND_TESTS + COUNT))
else
    log_error "Frontend dashboard-features test file not found"
    VALIDATION_PASSED=false
fi

if [ -f "e2e-tests/tests/main-flows.spec.ts" ]; then
    log_success "Frontend main-flows test file exists"
    COUNT=$(grep -c "test('should\|test.only('should\|test.skip('should" e2e-tests/tests/main-flows.spec.ts || echo "0")
    log_info "  - main-flows.spec.ts: ~$COUNT tests"
    FRONTEND_TESTS=$((FRONTEND_TESTS + COUNT))
else
    log_error "Frontend main-flows test file not found"
    VALIDATION_PASSED=false
fi

log_info "Total frontend tests found: ~$FRONTEND_TESTS"

if [ -f "e2e-tests/package.json" ]; then
    if grep -q "\"test\":" e2e-tests/package.json; then
        log_success "Frontend test script is configured"
    else
        log_error "Frontend test script not found in package.json"
        VALIDATION_PASSED=false
    fi
else
    log_error "Frontend e2e-tests package.json not found"
    VALIDATION_PASSED=false
fi

echo ""
log_info "Validating Docker configuration..."

if [ -f "ticketing-suite/docker-compose.yml" ]; then
    log_success "Docker Compose file exists"
    
    # Check for required services
    if grep -q "db:" ticketing-suite/docker-compose.yml; then
        log_success "  - PostgreSQL service configured"
    else
        log_warning "  - PostgreSQL service not found"
    fi
    
    if grep -q "redis:" ticketing-suite/docker-compose.yml; then
        log_success "  - Redis service configured"
    else
        log_warning "  - Redis service not found"
    fi
    
    if grep -q "ticketing:" ticketing-suite/docker-compose.yml; then
        log_success "  - Backend service configured"
    else
        log_warning "  - Backend service not found"
    fi
    
    if grep -q "dashboard:" ticketing-suite/docker-compose.yml; then
        log_success "  - Frontend service configured"
    else
        log_warning "  - Frontend service not found"
    fi
else
    log_error "Docker Compose file not found"
    VALIDATION_PASSED=false
fi

echo ""
log_info "Validating test dependencies..."

# Check backend dependencies
if [ -f "ticketing-suite/ticketing/package.json" ]; then
    if grep -q "@nestjs/testing" ticketing-suite/ticketing/package.json; then
        log_success "Backend testing dependencies configured"
    else
        log_warning "Backend testing dependencies may be missing"
    fi
fi

# Check frontend dependencies
if [ -f "e2e-tests/package.json" ]; then
    if grep -q "@playwright/test" e2e-tests/package.json; then
        log_success "Frontend testing dependencies configured"
    else
        log_error "Playwright dependency not found"
        VALIDATION_PASSED=false
    fi
fi

echo ""
log_info "Checking test documentation..."

docs=(
    "E2E_TEST_EXECUTION_GUIDE.md"
    "TESTING_GUIDE.md"
    "DASHBOARD_E2E_TESTING_SUMMARY.md"
    "TEST_README.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        log_success "Documentation exists: $doc"
    else
        log_warning "Documentation not found: $doc"
    fi
done

echo ""
log_info "Checking test execution scripts..."

if [ -f "run-e2e-tests.sh" ]; then
    log_success "Test execution script exists: run-e2e-tests.sh"
    if [ -x "run-e2e-tests.sh" ]; then
        log_success "  - Script is executable"
    else
        log_warning "  - Script is not executable (run: chmod +x run-e2e-tests.sh)"
    fi
else
    log_warning "Test execution script not found: run-e2e-tests.sh"
fi

echo ""
log_info "Checking CI/CD configuration..."

if [ -f ".github/workflows/e2e-tests.yml" ]; then
    log_success "GitHub Actions workflow exists"
else
    log_warning "GitHub Actions workflow not found"
fi

echo ""
echo "=========================================="
echo "  Validation Summary"
echo "=========================================="
echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    log_success "✅ All critical validations passed!"
    echo ""
    echo "The E2E test suite is properly configured and ready to run."
    echo ""
    echo "To run tests:"
    echo "  ./run-e2e-tests.sh"
    echo ""
    echo "Or manually:"
    echo "  cd ticketing-suite && docker-compose up -d"
    echo "  cd ticketing && npm run test:e2e"
    echo "  cd ../../e2e-tests && npm test"
    echo ""
    exit 0
else
    log_error "❌ Some validations failed"
    echo ""
    echo "Please review the errors above and fix any issues before running tests."
    echo ""
    exit 1
fi
