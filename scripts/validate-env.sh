#!/bin/bash

# Environment Variables Validation Script
# Validates that all required environment variables are set correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Environment Variables Validation Tool           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check if variable is set
check_required() {
    local var_name="$1"
    local var_value="${!var_name}"
    local description="$2"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name${NC} is not set"
        echo -e "${YELLOW}   Description: $description${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo -e "${GREEN}✅ $var_name${NC} is set"
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name="$1"
    local var_value="${!var_name}"
    local description="$2"
    
    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠️  $var_name${NC} is not set (optional)"
        echo -e "${YELLOW}   Description: $description${NC}"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}✅ $var_name${NC} is set"
        return 0
    fi
}

# Function to test database connection
test_database() {
    if [ -n "$DATABASE_URL" ]; then
        echo -e "${BLUE}Testing database connection...${NC}"
        
        # Extract connection details from DATABASE_URL
        if command -v psql &> /dev/null; then
            if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
                echo -e "${GREEN}✅ Database connection successful${NC}"
                return 0
            else
                echo -e "${RED}❌ Database connection failed${NC}"
                ERRORS=$((ERRORS + 1))
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  psql not found, skipping database connection test${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

# Function to test Redis connection
test_redis() {
    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        echo -e "${BLUE}Testing Redis connection...${NC}"
        
        if command -v redis-cli &> /dev/null; then
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
                echo -e "${GREEN}✅ Redis connection successful${NC}"
                return 0
            else
                echo -e "${RED}❌ Redis connection failed${NC}"
                ERRORS=$((ERRORS + 1))
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  redis-cli not found, skipping Redis connection test${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

# Check backend environment
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Checking Backend Environment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

BACKEND_DIR="$(dirname "$0")/../ticketing-suite/ticketing"

if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ Backend .env file found${NC}"
    
    # Load backend environment variables
    export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
    
    echo ""
    echo -e "${BLUE}Required Variables:${NC}"
    check_required "DATABASE_URL" "PostgreSQL connection string"
    check_required "JWT_SECRET" "Secret key for JWT token signing"
    check_required "REDIS_HOST" "Redis server hostname"
    check_required "REDIS_PORT" "Redis server port"
    
    echo ""
    echo -e "${BLUE}Optional Variables (Development):${NC}"
    check_optional "PORT" "API server port (default: 3000)"
    check_optional "NODE_ENV" "Node environment (development/production)"
    
    echo ""
    echo -e "${BLUE}Optional Variables (Production - OIDC):${NC}"
    check_optional "OIDC_ISSUER" "OIDC provider issuer URL"
    check_optional "OIDC_AUDIENCE" "OIDC API audience"
    check_optional "TENANT_CLAIM" "JWT claim name for tenant ID"
    check_optional "ROLE_CLAIM" "JWT claim name for user roles"
    
    echo ""
    echo -e "${BLUE}Optional Variables (AWS S3):${NC}"
    check_optional "AWS_REGION" "AWS region for S3"
    check_optional "AWS_ACCESS_KEY_ID" "AWS access key"
    check_optional "AWS_SECRET_ACCESS_KEY" "AWS secret key"
    check_optional "S3_BUCKET" "S3 bucket name for attachments"
    
    echo ""
    echo -e "${BLUE}Optional Variables (OpenSearch):${NC}"
    check_optional "OPENSEARCH_NODE" "OpenSearch node URL"
    check_optional "OPENSEARCH_USERNAME" "OpenSearch username"
    check_optional "OPENSEARCH_PASSWORD" "OpenSearch password"
    
    echo ""
    echo -e "${BLUE}Connection Tests:${NC}"
    test_database
    test_redis
    
else
    echo -e "${RED}❌ Backend .env file not found at $BACKEND_DIR/.env${NC}"
    echo -e "${YELLOW}   Create a .env file based on .env.example${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check frontend environment
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Checking Frontend Environment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

FRONTEND_DIR="$(dirname "$0")/../ticketing-suite/ticketing-dashboard"

if [ -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ Frontend .env file found${NC}"
    
    # Load frontend environment variables
    export $(cat "$FRONTEND_DIR/.env" | grep -v '^#' | xargs)
    
    echo ""
    echo -e "${BLUE}Frontend Variables:${NC}"
    check_optional "VITE_API_BASE" "Backend API base URL (default: http://localhost:3000)"
    check_optional "VITE_WS_BASE" "WebSocket base URL (default: ws://localhost:3000)"
    
    # Validate API base URL format
    if [ -n "$VITE_API_BASE" ]; then
        if [[ "$VITE_API_BASE" =~ ^https?:// ]]; then
            echo -e "${GREEN}✅ VITE_API_BASE has valid URL format${NC}"
        else
            echo -e "${RED}❌ VITE_API_BASE should start with http:// or https://${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    fi
    
else
    echo -e "${YELLOW}⚠️  Frontend .env file not found${NC}"
    echo -e "${YELLOW}   This is optional. Frontend will use default values.${NC}"
    echo -e "${YELLOW}   Default VITE_API_BASE: http://localhost:3000${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Deployment-specific checks
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Configuration Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ "$NODE_ENV" = "production" ]; then
    echo -e "${BLUE}Production environment detected${NC}"
    echo ""
    
    if [ -z "$OIDC_ISSUER" ] || [ -z "$OIDC_AUDIENCE" ]; then
        echo -e "${YELLOW}⚠️  OIDC not configured - using development JWT mode${NC}"
        echo -e "${YELLOW}   For production, configure OIDC_ISSUER and OIDC_AUDIENCE${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ OIDC is configured for production${NC}"
    fi
    
    if [ -z "$AWS_ACCESS_KEY_ID" ]; then
        echo -e "${YELLOW}⚠️  AWS credentials not configured${NC}"
        echo -e "${YELLOW}   Attachment uploads will not work without S3${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ AWS credentials are configured${NC}"
    fi
    
    if [ -z "$OPENSEARCH_NODE" ]; then
        echo -e "${YELLOW}⚠️  OpenSearch not configured${NC}"
        echo -e "${YELLOW}   Full-text search will not be available${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ OpenSearch is configured${NC}"
    fi
else
    echo -e "${BLUE}Development environment detected${NC}"
    echo -e "${GREEN}✅ Development mode allows JWT tokens without OIDC${NC}"
fi

# CORS Configuration Check
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CORS Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ -n "$FRONTEND_URL" ]; then
    echo -e "${GREEN}✅ FRONTEND_URL is set: $FRONTEND_URL${NC}"
    echo -e "${YELLOW}   Ensure main.ts uses this for CORS configuration in production${NC}"
else
    echo -e "${YELLOW}⚠️  FRONTEND_URL not set${NC}"
    echo -e "${YELLOW}   Backend currently accepts requests from any origin (origin: true)${NC}"
    echo -e "${YELLOW}   For production, set FRONTEND_URL and update CORS config${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s)${NC}"
fi

echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Environment is fully configured!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Environment is usable but has warnings${NC}"
    echo -e "${YELLOW}   Review warnings above for optimal configuration${NC}"
    exit 0
else
    echo -e "${RED}❌ Environment configuration has errors${NC}"
    echo -e "${RED}   Fix errors above before running the application${NC}"
    exit 1
fi
