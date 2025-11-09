#!/bin/bash

# 403 Forbidden Error Diagnostic Script
# This script helps diagnose common causes of 403 errors in the Tickets system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
API_BASE="${API_BASE:-http://localhost:3000}"
FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:5173}"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Tickets System - 403 Error Diagnostic Tool      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}API Base URL:${NC} $API_BASE"
echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_BASE"
echo ""

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
}

# Function to check if backend is running
check_backend() {
    print_section "1. Checking Backend Connectivity"
    
    if curl -s -f -o /dev/null "$API_BASE/health" 2>/dev/null; then
        echo -e "${GREEN}✅ Backend is running and accessible${NC}"
        
        # Get health status
        HEALTH=$(curl -s "$API_BASE/health")
        echo -e "${GREEN}   Health status:${NC} $HEALTH"
        return 0
    else
        echo -e "${RED}❌ Backend is not accessible at $API_BASE${NC}"
        echo -e "${YELLOW}   Please start the backend server:${NC}"
        echo -e "${YELLOW}   cd ticketing-suite/ticketing && npm run dev${NC}"
        return 1
    fi
}

# Function to generate a dev JWT token
generate_dev_token() {
    local user_id="${1:-test-user}"
    local tenant_id="${2:-tenant-1}"
    local role="${3:-USER}"
    
    node -e "
const payload = {
  sub: '$user_id',
  tenantId: '$tenant_id',
  roles: ['$role'],
  email: '$user_id@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400
};
const b64 = (s) => Buffer.from(JSON.stringify(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
console.log(b64({alg:'HS256',typ:'JWT'}) + '.' + b64(payload) + '.sig');
"
}

# Function to decode JWT token
decode_token() {
    local token="$1"
    echo "$token" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "$token" | cut -d'.' -f2 | base64 -d 2>/dev/null
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local token="$3"
    local data="$4"
    local description="$5"
    
    echo ""
    echo -e "${BLUE}Testing:${NC} $description"
    echo -e "${BLUE}Endpoint:${NC} $method $endpoint"
    
    local curl_cmd="curl -s -w '\nHTTP_CODE:%{http_code}' -X $method '$API_BASE$endpoint'"
    
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ] || [ "$http_code" -eq 204 ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "${GREEN}   Response:${NC} $(echo "$body" | jq -r '.' 2>/dev/null || echo "$body" | head -c 200)"
        fi
    elif [ "$http_code" -eq 401 ]; then
        echo -e "${RED}❌ Unauthorized (HTTP 401)${NC}"
        echo -e "${YELLOW}   Issue: Missing or invalid authentication token${NC}"
        echo -e "${YELLOW}   Fix: Ensure you provide a valid JWT token${NC}"
    elif [ "$http_code" -eq 403 ]; then
        echo -e "${RED}❌ Forbidden (HTTP 403)${NC}"
        echo -e "${YELLOW}   Issue: Insufficient permissions or role${NC}"
        if [ -n "$body" ]; then
            echo -e "${YELLOW}   Error:${NC} $(echo "$body" | jq -r '.message' 2>/dev/null || echo "$body")"
        fi
    elif [ "$http_code" -eq 429 ]; then
        echo -e "${RED}❌ Too Many Requests (HTTP 429)${NC}"
        echo -e "${YELLOW}   Issue: Rate limit exceeded${NC}"
        echo -e "${YELLOW}   Fix: Wait 60 seconds and try again${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTP $http_code${NC}"
        if [ -n "$body" ]; then
            echo -e "${YELLOW}   Response:${NC} $(echo "$body" | jq -r '.' 2>/dev/null || echo "$body" | head -c 200)"
        fi
    fi
}

# Main diagnostic flow
main() {
    # Check backend connectivity
    if ! check_backend; then
        exit 1
    fi
    
    # Test authentication scenarios
    print_section "2. Testing Authentication Scenarios"
    
    echo -e "${BLUE}Generating test tokens...${NC}"
    USER_TOKEN=$(generate_dev_token "test-user" "tenant-1" "USER")
    ADMIN_TOKEN=$(generate_dev_token "admin-user" "tenant-1" "ADMIN")
    
    echo -e "${GREEN}✅ User token generated${NC}"
    echo -e "${GREEN}✅ Admin token generated${NC}"
    
    # Decode tokens to show what's inside
    print_section "3. Token Analysis"
    echo -e "${BLUE}User Token Payload:${NC}"
    decode_token "$USER_TOKEN"
    echo ""
    echo -e "${BLUE}Admin Token Payload:${NC}"
    decode_token "$ADMIN_TOKEN"
    
    # Test public endpoint
    print_section "4. Testing Public Endpoints"
    test_endpoint "GET" "/health" "" "" "Health check (no auth required)"
    
    # Test without authentication
    print_section "5. Testing Without Authentication"
    test_endpoint "GET" "/tickets" "" "" "List tickets without auth (should fail with 401)"
    test_endpoint "GET" "/directory/sites" "" "" "List sites without auth (should fail with 401)"
    
    # Test with USER role
    print_section "6. Testing with USER Role"
    test_endpoint "GET" "/tickets" "$USER_TOKEN" "" "List tickets as USER"
    test_endpoint "GET" "/directory/sites" "$USER_TOKEN" "" "List sites as USER"
    test_endpoint "GET" "/directory/users" "$USER_TOKEN" "" "List users as USER"
    test_endpoint "POST" "/directory/sites" "$USER_TOKEN" '{"name":"Test Site","location":"Test"}' "Create site as USER (should fail with 403)"
    
    # Test with ADMIN role
    print_section "7. Testing with ADMIN Role"
    test_endpoint "GET" "/tickets" "$ADMIN_TOKEN" "" "List tickets as ADMIN"
    test_endpoint "POST" "/directory/sites" "$ADMIN_TOKEN" '{"name":"Test Site","location":"Test"}' "Create site as ADMIN (should succeed)"
    
    # Test CORS
    print_section "8. Testing CORS Configuration"
    echo -e "${BLUE}Testing CORS preflight request...${NC}"
    CORS_RESPONSE=$(curl -s -i -X OPTIONS "$API_BASE/tickets" \
        -H "Origin: $FRONTEND_BASE" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization")
    
    if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}✅ CORS is properly configured${NC}"
        echo "$CORS_RESPONSE" | grep "Access-Control-Allow"
    else
        echo -e "${RED}❌ CORS headers not found${NC}"
        echo -e "${YELLOW}   This might cause issues when accessing API from frontend${NC}"
    fi
    
    # Check rate limiting
    print_section "9. Testing Rate Limiting"
    echo -e "${BLUE}Sending 5 rapid requests to check rate limiting...${NC}"
    
    for i in {1..5}; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $USER_TOKEN" "$API_BASE/health")
        echo -e "Request $i: HTTP $HTTP_CODE"
        if [ "$HTTP_CODE" -eq 429 ]; then
            echo -e "${RED}❌ Rate limit hit after $i requests${NC}"
            echo -e "${YELLOW}   Current limit: 120 requests per 60 seconds${NC}"
            break
        fi
    done
    
    if [ "$HTTP_CODE" -ne 429 ]; then
        echo -e "${GREEN}✅ Rate limiting is working properly (no limit hit in test)${NC}"
    fi
    
    # Summary
    print_section "10. Diagnostic Summary"
    
    echo -e "${BLUE}Common 403 Error Causes:${NC}"
    echo ""
    echo -e "${YELLOW}1. Missing JWT Token${NC}"
    echo "   → Make sure Authorization header is present"
    echo "   → Format: Authorization: Bearer <token>"
    echo ""
    echo -e "${YELLOW}2. Insufficient Role${NC}"
    echo "   → Check if your user has the required role (USER or ADMIN)"
    echo "   → Admin operations require ADMIN role"
    echo "   → Use: $0 check-token <your-token>"
    echo ""
    echo -e "${YELLOW}3. Cross-Tenant Access${NC}"
    echo "   → Ensure tenantId in token matches resource tenant"
    echo "   → Each tenant can only access their own data"
    echo ""
    echo -e "${YELLOW}4. Ownership Violation${NC}"
    echo "   → You can only edit/delete your own comments"
    echo "   → Check authorUserId matches your token's sub claim"
    echo ""
    echo -e "${YELLOW}5. Rate Limiting${NC}"
    echo "   → Wait 60 seconds if you hit the rate limit"
    echo "   → Current limit: 120 requests per 60 seconds"
    echo ""
    
    echo -e "${GREEN}For detailed troubleshooting, see: TROUBLESHOOTING_403_ERRORS.md${NC}"
}

# Handle command line arguments
case "${1:-diagnose}" in
    diagnose)
        main
        ;;
    check-token)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Token required${NC}"
            echo "Usage: $0 check-token <jwt-token>"
            exit 1
        fi
        print_section "Token Analysis"
        echo -e "${BLUE}Decoding token...${NC}"
        decode_token "$2"
        ;;
    generate-token)
        USER_ID="${2:-test-user}"
        TENANT_ID="${3:-tenant-1}"
        ROLE="${4:-USER}"
        print_section "Generate Development Token"
        echo -e "${BLUE}Generating token with:${NC}"
        echo "  User ID: $USER_ID"
        echo "  Tenant ID: $TENANT_ID"
        echo "  Role: $ROLE"
        echo ""
        TOKEN=$(generate_dev_token "$USER_ID" "$TENANT_ID" "$ROLE")
        echo -e "${GREEN}Token:${NC}"
        echo "$TOKEN"
        echo ""
        echo -e "${BLUE}Payload:${NC}"
        decode_token "$TOKEN"
        ;;
    help)
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  diagnose              Run full diagnostic suite (default)"
        echo "  check-token <token>   Decode and analyze a JWT token"
        echo "  generate-token [user] [tenant] [role]"
        echo "                        Generate a development JWT token"
        echo "  help                  Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  API_BASE              Backend API URL (default: http://localhost:3000)"
        echo "  FRONTEND_BASE         Frontend URL (default: http://localhost:5173)"
        echo ""
        echo "Examples:"
        echo "  $0"
        echo "  $0 check-token eyJhbGc..."
        echo "  $0 generate-token admin-user tenant-1 ADMIN"
        echo "  API_BASE=https://api.example.com $0 diagnose"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
