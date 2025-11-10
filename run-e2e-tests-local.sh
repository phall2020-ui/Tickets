#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 End-to-End Test Runner (Local Mode)${NC}"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${BLUE}📦 Starting infrastructure services...${NC}"
cd ticketing-suite

# Stop any existing containers
echo "Stopping any existing containers..."
$DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true

# Start only infrastructure services (db, redis, opensearch)
echo "Starting database, Redis, and OpenSearch..."
$DOCKER_COMPOSE up -d db redis opensearch

echo ""
echo -e "${YELLOW}⏳ Waiting for infrastructure services...${NC}"

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
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ Infrastructure services ready!${NC}"
echo ""

# Setup backend service
echo -e "${BLUE}📦 Setting up backend service...${NC}"
cd ticketing

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
REDIS_URL="redis://localhost:6379"
S3_BUCKET="ticketing-attachments"
AWS_REGION="eu-west-2"
OPENSEARCH_NODE="http://localhost:9200"
OPENSEARCH_USER="admin"
OPENSEARCH_PASS="admin"
NODE_ENV="development"
PORT=3000
EOF
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install --legacy-peer-deps
fi

# Build the backend
echo "Building backend..."
npm run build

# Run migrations and seed
echo "Running database migrations..."
npx prisma generate

# Drop and recreate the database to ensure a clean state
echo "Resetting database..."
PGPASSWORD=postgres psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS ticketing;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE ticketing;" 2>/dev/null || true

# Now deploy all migrations from scratch
npx prisma migrate deploy

echo "Seeding database..."
npm run seed || true

# Start backend in background
echo "Starting backend API..."
npm run start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo -n "Waiting for Backend API... "
for i in {1..120}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 120 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ Backend API failed to start${NC}"
        echo "Backend logs:"
        tail -50 /tmp/backend.log
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Setup dashboard
echo -e "${BLUE}📦 Setting up dashboard...${NC}"
cd ../ticketing-dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dashboard dependencies..."
    npm install
fi

# Create .env file for dashboard
cat > .env << 'EOF'
VITE_API_BASE=http://localhost:3000
EOF

# Start dashboard in background using dev mode
echo "Starting dashboard..."
npm run dev > /tmp/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"

# Wait for dashboard
echo -n "Waiting for Dashboard... "
for i in {1..60}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${RED}❌ Dashboard failed to start${NC}"
        echo "Dashboard logs:"
        tail -50 /tmp/dashboard.log
        kill $BACKEND_PID $DASHBOARD_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ All services are running!${NC}"
echo ""

# Go back to root directory
cd ../../

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
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium 2>/dev/null || echo "Skipping Playwright browser install (may already be installed)"

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
echo "Stopping services..."

# Kill Node processes
kill $BACKEND_PID 2>/dev/null || true
kill $DASHBOARD_PID 2>/dev/null || true

# Stop Docker services
cd ../ticketing-suite
$DOCKER_COMPOSE down

echo -e "${GREEN}✅ All services stopped${NC}"

echo ""
echo -e "${BLUE}======================================"
echo "E2E Test Run Complete"
echo -e "======================================${NC}"

exit $TEST_EXIT_CODE
