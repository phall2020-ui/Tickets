#!/bin/bash
# Verification script for Railway deployment fixes

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Railway Deployment Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if app URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./verify-deployment.sh <railway-app-url>"
  echo "Example: ./verify-deployment.sh https://ticketing-production.up.railway.app"
  exit 1
fi

APP_URL="$1"
HEALTH_URL="${APP_URL}/health"

echo "🔍 Checking deployment at: ${APP_URL}"
echo ""

# Test 1: Health endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checking ${HEALTH_URL}..."
echo ""

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Health endpoint returned 200 OK"
  echo ""
  
  # Get health response
  HEALTH_RESPONSE=$(curl -s "${HEALTH_URL}")
  echo "Health response:"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
  echo ""
  
  # Check database status
  DB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.info.database.status' 2>/dev/null || echo "unknown")
  if [ "$DB_STATUS" = "up" ]; then
    echo "✅ Database is connected"
  else
    echo "⚠️  Database status: $DB_STATUS"
  fi
  
  # Check Redis status
  REDIS_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.info.redis.status' 2>/dev/null || echo "unknown")
  if [ "$REDIS_STATUS" = "up" ]; then
    echo "✅ Redis is connected"
  else
    echo "⚠️  Redis status: $REDIS_STATUS"
  fi
  
elif [ "$HTTP_STATUS" = "503" ]; then
  echo "⚠️  Health endpoint returned 503 (Service Unavailable)"
  echo "This typically means the app is running but one or more services are down."
  echo ""
  
  HEALTH_RESPONSE=$(curl -s "${HEALTH_URL}")
  echo "Health response:"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
  
elif [ "$HTTP_STATUS" = "502" ]; then
  echo "❌ Health endpoint returned 502 (Bad Gateway)"
  echo "This means Railway's proxy cannot connect to the application."
  echo ""
  echo "Troubleshooting steps:"
  echo "1. Check Railway logs for startup errors"
  echo "2. Look for where startup sequence stops"
  echo "3. Verify DATABASE_URL and REDIS_URL are set correctly"
  echo "4. Ensure REDIS_URL uses 'rediss://' (with TLS)"
  
elif [ "$HTTP_STATUS" = "000" ]; then
  echo "❌ Cannot connect to ${APP_URL}"
  echo "Please verify the URL is correct and the app is deployed."
  
else
  echo "⚠️  Unexpected status code: ${HTTP_STATUS}"
fi

echo ""

# Test 2: Response time
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Response Time"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Measuring response time..."
echo ""

RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "${HEALTH_URL}" 2>/dev/null || echo "error")

if [ "$RESPONSE_TIME" != "error" ]; then
  echo "Response time: ${RESPONSE_TIME}s"
  
  # Convert to milliseconds for comparison
  MS=$(echo "$RESPONSE_TIME * 1000" | bc)
  MS_INT=${MS%.*}
  
  if [ "$MS_INT" -lt 500 ]; then
    echo "✅ Excellent response time (<500ms)"
  elif [ "$MS_INT" -lt 1000 ]; then
    echo "✅ Good response time (<1s)"
  elif [ "$MS_INT" -lt 3000 ]; then
    echo "⚠️  Acceptable response time (<3s)"
  else
    echo "⚠️  Slow response time (>3s)"
  fi
else
  echo "❌ Could not measure response time"
fi

echo ""

# Test 3: Check if API prefix is configured
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: API Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try with /api prefix
API_HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/api/health" 2>/dev/null || echo "000")

if [ "$API_HEALTH_STATUS" = "200" ]; then
  echo "✅ API is accessible at /api prefix"
  echo "   Health endpoint: ${APP_URL}/api/health"
elif [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ API is accessible without prefix"
  echo "   Health endpoint: ${APP_URL}/health"
else
  echo "ℹ️  API prefix configuration unknown"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$HTTP_STATUS" = "200" ] && [ "$DB_STATUS" = "up" ] && [ "$REDIS_STATUS" = "up" ]; then
  echo "✅ All checks passed! Deployment is healthy."
  echo ""
  echo "Next steps:"
  echo "- Test your API endpoints"
  echo "- Monitor Railway logs for any warnings"
  echo "- Check performance metrics"
elif [ "$HTTP_STATUS" = "200" ]; then
  echo "⚠️  App is running but some services may be degraded."
  echo ""
  echo "Check Railway logs for details."
else
  echo "❌ Deployment has issues that need attention."
  echo ""
  echo "Troubleshooting:"
  echo "1. Check Railway deployment logs"
  echo "2. Review environment variables:"
  echo "   - DATABASE_URL should include ?sslmode=require"
  echo "   - REDIS_URL should use rediss:// protocol (with TLS)"
  echo "3. See RAILWAY_DEPLOYMENT.md for detailed troubleshooting"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
