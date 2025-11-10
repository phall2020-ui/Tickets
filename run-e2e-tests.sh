#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 End-to-End Test Runner${NC}"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Error: docker-compose is not installed${NC}"
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${BLUE}📦 Starting services with Docker Compose...${NC}"
cd ticketing-suite

# Stop any existing containers
echo "Stopping any existing containers..."
$DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true

# Start services
echo "Starting all services..."
$DOCKER_COMPOSE up -d

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL... "
for i in {1..60}; do
    if docker exec ticketing-suite-db-1 pg_isready -U postgres > /dev/null 2>&1 || \
       docker exec ticketing-suite_db_1 pg_isready -U postgres > /dev/null 2>&1 || \
       docker exec ticketing-db-1 pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        $DOCKER_COMPOSE logs db
        exit 1
    fi
    sleep 1
done

# Wait for Redis
echo -n "Waiting for Redis... "
for i in {1..60}; do
    if docker exec ticketing-suite-redis-1 redis-cli ping > /dev/null 2>&1 || \
       docker exec ticketing-suite_redis_1 redis-cli ping > /dev/null 2>&1 || \
       docker exec ticketing-redis-1 redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ Redis failed to start${NC}"
        $DOCKER_COMPOSE logs redis
        exit 1
    fi
    sleep 1
done

# Wait for OpenSearch
echo -n "Waiting for OpenSearch... "
for i in {1..90}; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 90 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ OpenSearch failed to start${NC}"
        $DOCKER_COMPOSE logs opensearch
        exit 1
    fi
    sleep 1
done

# Wait for Backend API
echo -n "Waiting for Backend API... "
for i in {1..120}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 120 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ Backend API failed to start${NC}"
        $DOCKER_COMPOSE logs ticketing
        exit 1
    fi
    sleep 1
done

# Wait for Dashboard
echo -n "Waiting for Dashboard... "
for i in {1..60}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ Dashboard failed to start${NC}"
        $DOCKER_COMPOSE logs dashboard
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ All services are running!${NC}"
echo ""

# Go back to root directory
cd ..

# Install e2e test dependencies
echo -e "${BLUE}📦 Installing e2e test dependencies...${NC}"
cd e2e-tests

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "Dependencies already installed."
fi

# Install Playwright browsers if needed
echo "Checking Playwright browsers..."
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium

echo ""
echo -e "${BLUE}🧪 Running E2E Tests...${NC}"
echo "======================================"
echo ""

# Run tests and capture exit code
set +e
npm test
TEST_EXIT_CODE=$?
set -e

echo ""
echo "======================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed or had issues${NC}"
fi
echo ""

# Show test report location
echo -e "${BLUE}📊 Test Report:${NC}"
if [ -d "playwright-report" ]; then
    echo "HTML report available at: e2e-tests/playwright-report/index.html"
    echo "To view: npx playwright show-report"
fi

echo ""
echo -e "${BLUE}🧹 Cleanup${NC}"
read -p "Do you want to stop the services? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../ticketing-suite
    echo "Stopping services..."
    $DOCKER_COMPOSE down
    echo -e "${GREEN}✅ Services stopped${NC}"
else
    echo "Services are still running. To stop them manually, run:"
    echo "  cd ticketing-suite && $DOCKER_COMPOSE down"
fi

echo ""
echo -e "${BLUE}======================================"
echo "E2E Test Run Complete"
echo -e "======================================${NC}"

exit $TEST_EXIT_CODE
