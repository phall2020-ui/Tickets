# 403 Forbidden Error Troubleshooting Guide

This document provides comprehensive guidance for diagnosing and resolving 403 Forbidden errors in the Tickets system.

## Table of Contents

1. [Overview](#overview)
2. [Quick Diagnosis](#quick-diagnosis)
3. [Common 403 Causes](#common-403-causes)
4. [Backend Analysis](#backend-analysis)
5. [Frontend Analysis](#frontend-analysis)
6. [Testing & Verification](#testing--verification)
7. [Fix Plans](#fix-plans)
8. [Environment Variables](#environment-variables)
9. [Deployment Notes](#deployment-notes)

## Overview

The Tickets system uses JWT authentication and RBAC (Role-Based Access Control) to secure API endpoints. Multiple factors can cause 403 Forbidden responses:

- **Authentication**: Missing, expired, or invalid JWT tokens
- **Authorization**: Insufficient roles or permissions
- **CORS**: Cross-Origin Resource Sharing configuration issues
- **Rate Limiting**: Too many requests in a short time
- **Ownership**: Attempting to modify resources owned by other users
- **Multi-tenancy**: Cross-tenant access attempts

## Quick Diagnosis

### Step 1: Check if you have a valid token

```bash
# Check localStorage in browser console
localStorage.getItem('token')
```

If null or undefined, you need to log in first.

### Step 2: Decode your JWT token

```bash
# In browser console or Node.js
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

Verify:
- `sub` (user ID) is present
- `tenantId` is present
- `roles` array contains appropriate roles ('ADMIN' or 'USER')
- `exp` (expiration) is in the future

### Step 3: Check the request in Network tab

1. Open Chrome DevTools → Network tab
2. Find the failing request
3. Check:
   - **Request Headers**: Is `Authorization: Bearer <token>` present?
   - **Response Headers**: What is the exact status code and message?
   - **Preflight Request**: Is there an OPTIONS request that's failing?

## Common 403 Causes

### Category 1: Authentication Errors

| Cause | Symptoms | Fix |
|-------|----------|-----|
| No token provided | Missing Authorization header | Log in and ensure token is saved to localStorage |
| Expired token | 401 or 403 after successful login | Implement token refresh or re-login |
| Malformed token | Invalid JWT format error | Clear localStorage and log in again |
| Wrong token format | "Invalid token format" error | Ensure Bearer prefix and proper structure |

### Category 2: RBAC/Guard Errors

| Cause | Symptoms | Fix |
|-------|----------|-----|
| Insufficient role | "Insufficient role" error | Use ADMIN account or request role upgrade |
| Missing roles in token | Token has no roles array | Ensure JWT includes roles claim |
| Wrong role name | Token has different role names | Match role names: 'ADMIN' or 'USER' |

### Category 3: CORS/Preflight Errors

| Cause | Symptoms | Fix |
|-------|----------|-----|
| Wrong origin | CORS error in console | Update CORS configuration in main.ts |
| Missing preflight response | OPTIONS request fails | Ensure server allows OPTIONS method |
| Missing CORS headers | No Access-Control-Allow-Origin | Check main.ts CORS setup |

### Category 4: Ownership/Permission Errors

| Cause | Symptoms | Fix |
|-------|----------|-----|
| Editing others' comments | "You can only edit your own comments" | Only edit your own content or use ADMIN |
| Deleting others' resources | Forbidden on DELETE | Check resource ownership |
| Cross-tenant access | 404 or empty results | Ensure tenantId matches in token |

### Category 5: Rate Limiting

| Cause | Symptoms | Fix |
|-------|----------|-----|
| Too many requests | 429 or 403 after many requests | Wait 60 seconds and retry |
| Throttler config too strict | Immediate blocking | Adjust ThrottlerGuard limits |

### Category 6: Environment Misconfigurations

| Cause | Symptoms | Fix |
|-------|----------|-----|
| Wrong API_BASE URL | All requests fail | Check VITE_API_BASE env variable |
| OIDC not configured | JWT validation fails | Set OIDC_ISSUER for production |
| Missing JWT_SECRET | Token validation errors | Set JWT_SECRET env variable |

## Backend Analysis

### Guards Configuration

The system uses two main guards applied at controller level:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

#### JwtAuthGuard
- **Location**: `src/common/auth.guard.ts`
- **Purpose**: Validates JWT tokens
- **Dev Mode**: Without `OIDC_ISSUER`, decodes tokens without verification
- **Production**: Validates against OIDC provider using JWKS

**Potential 403 Sources**:
- Missing Authorization header → 401 Unauthorized
- Invalid token format → 401 Unauthorized
- Expired token (production only) → 401 Unauthorized

#### RolesGuard
- **Location**: `src/auth/roles.guard.ts`
- **Purpose**: Checks if user has required roles
- **Configuration**: Via `@Roles()` decorator on endpoints

**Potential 403 Sources**:
- User role not in required roles → 403 "Insufficient role"
- No roles in token payload → 403 "Insufficient role"

### Protected Endpoints by Role

#### ADMIN Only
- `POST /auth/register` - Register new users
- `PATCH /users/:id` - Update any user
- `DELETE /users/:id` - Delete users
- `POST /users/:id/reset-password` - Reset user passwords
- `POST /directory/sites` - Create sites
- `PATCH /directory/sites/:id` - Update sites
- `DELETE /directory/sites/:id` - Delete sites
- `POST /directory/issue-types` - Create issue types
- `PATCH /directory/issue-types/:id` - Update issue types
- `DELETE /directory/issue-types/:id` - Deactivate issue types
- `POST /directory/field-definitions` - Create field definitions
- `PATCH /directory/field-definitions/:id` - Update field definitions
- `DELETE /directory/field-definitions/:id` - Delete field definitions

#### ADMIN or USER
- All ticket operations (CRUD)
- All comment operations
- All attachment operations
- Directory listing (sites, users, issue-types, field-definitions)
- User profile updates (`PATCH /users/profile`, `POST /users/profile/change-password`)

#### No Auth Required
- `GET /health` - Health check endpoints
- `POST /auth/login` - User login

### CORS Configuration

**Location**: `src/main.ts`

```typescript
app.enableCors({ origin: true });
```

This configuration accepts requests from **any origin**. In production, you should restrict this:

```typescript
app.enableCors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true 
});
```

### Rate Limiting (ThrottlerGuard)

**Configuration**: `src/app.module.ts`

```typescript
ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }])
```

- **Limit**: 120 requests per 60 seconds per IP
- **Behavior**: Returns 429 Too Many Requests (not 403)

## Frontend Analysis

### Axios Configuration

**Location**: `ticketing-suite/ticketing-dashboard/src/lib/api.ts`

```typescript
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API_BASE })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**Potential 403 Sources**:
1. Token not in localStorage → Request without Authorization header
2. Wrong `VITE_API_BASE` → Request to wrong server
3. Token expired but still in localStorage → Invalid token sent

### API Endpoints Used

The frontend makes requests to:
- `/tickets` - List, create, update tickets
- `/tickets/:id` - Get ticket details
- `/tickets/:id/history` - Get ticket history
- `/tickets/:ticketId/comments` - Comment operations
- `/tickets/:ticketId/attachments` - Attachment operations
- `/directory/sites` - Site management
- `/directory/users` - User listing
- `/directory/issue-types` - Issue type listing
- `/health` - Health checks
- `/auth/login` - Authentication
- `/auth/register` - User registration (ADMIN only)

### Common Frontend Issues

1. **Token not persisted**: After login, token not saved to localStorage
2. **Token not cleared**: After logout, old token remains
3. **No error handling**: 403 not caught and user not notified
4. **Wrong base URL**: VITE_API_BASE points to wrong server
5. **Preflight CORS**: Browser blocks OPTIONS requests (rare with origin: true)

## Testing & Verification

### Manual Testing with curl

#### 1. Test without authentication

```bash
curl -i http://localhost:3000/tickets
# Expected: 401 Unauthorized
```

#### 2. Test with invalid token

```bash
curl -i -H "Authorization: Bearer invalid-token" http://localhost:3000/tickets
# Expected: 401 Unauthorized
```

#### 3. Test with valid dev token (USER role)

```bash
# Generate a dev token
TOKEN=$(node -e "
const payload = {
  sub: 'test-user',
  tenantId: 'tenant-1',
  roles: ['USER'],
  email: 'test@example.com'
};
const b64 = (s) => Buffer.from(JSON.stringify(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
console.log(b64({alg:'HS256',typ:'JWT'}) + '.' + b64(payload) + '.sig');
")

curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/tickets
# Expected: 200 OK with empty array or tickets
```

#### 4. Test ADMIN-only endpoint with USER role

```bash
curl -i -H "Authorization: Bearer $TOKEN" \
  -X POST http://localhost:3000/directory/sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","location":"Test Location"}'
# Expected: 403 Forbidden "Insufficient role"
```

#### 5. Test with ADMIN role

```bash
TOKEN=$(node -e "
const payload = {
  sub: 'admin-user',
  tenantId: 'tenant-1',
  roles: ['ADMIN', 'USER'],
  email: 'admin@example.com'
};
const b64 = (s) => Buffer.from(JSON.stringify(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
console.log(b64({alg:'HS256',typ:'JWT'}) + '.' + b64(payload) + '.sig');
")

curl -i -H "Authorization: Bearer $TOKEN" \
  -X POST http://localhost:3000/directory/sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","location":"Test Location"}'
# Expected: 201 Created
```

#### 6. Test CORS preflight

```bash
curl -i -X OPTIONS http://localhost:3000/tickets \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization"
# Expected: 204 No Content with CORS headers
```

#### 7. Test cross-tenant access

```bash
# Create ticket with tenant-1
TOKEN_T1=$(node -e "
const payload = { sub: 'user1', tenantId: 'tenant-1', roles: ['USER'], email: 'user1@example.com' };
const b64 = (s) => Buffer.from(JSON.stringify(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
console.log(b64({alg:'HS256',typ:'JWT'}) + '.' + b64(payload) + '.sig');
")

# Try to access with tenant-2 token
TOKEN_T2=$(node -e "
const payload = { sub: 'user2', tenantId: 'tenant-2', roles: ['USER'], email: 'user2@example.com' };
const b64 = (s) => Buffer.from(JSON.stringify(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
console.log(b64({alg:'HS256',typ:'JWT'}) + '.' + b64(payload) + '.sig');
")

# Get tickets from tenant-1 with tenant-2 token
curl -i -H "Authorization: Bearer $TOKEN_T2" http://localhost:3000/tickets
# Expected: 200 OK but empty array (tenant isolation)
```

### Automated Test Suite

Run existing E2E tests:

```bash
cd ticketing-suite/ticketing
npm run test:e2e
```

The test suite includes:
- Authentication tests (no auth, valid auth)
- Role-based access tests (USER vs ADMIN)
- Multi-tenancy isolation tests
- Ownership tests (comment editing/deletion)

## Fix Plans

### Fix 1: Missing or Invalid Token

**Symptoms**: All API calls return 401 or 403

**Diagnosis**:
```javascript
// In browser console
console.log(localStorage.getItem('token'));
```

**Fix**:
1. Ensure login endpoint is working:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

2. Update frontend to save token after login:
```typescript
// In Login.tsx or auth service
const response = await axios.post('/auth/login', { email, password });
localStorage.setItem('token', response.data.token);
```

3. Clear old tokens:
```javascript
localStorage.removeItem('token');
// Then log in again
```

### Fix 2: Insufficient Role Error

**Symptoms**: 403 with "Insufficient role" message

**Diagnosis**: Check token roles
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User roles:', payload.roles);
```

**Fix**:
1. **Option A**: Use account with correct role (ADMIN for admin operations)
2. **Option B**: Update user role in database (ADMIN action):
```bash
curl -X PATCH http://localhost:3000/users/{userId} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"ADMIN"}'
```

3. **Option C**: Modify endpoint to allow USER role (code change):
```typescript
// In controller
@Roles('ADMIN', 'USER')  // Add USER role
async someMethod() { ... }
```

### Fix 3: CORS Issues

**Symptoms**: Browser console shows CORS error, requests blocked

**Diagnosis**: Check browser console for:
```
Access to XMLHttpRequest at 'http://api.example.com/tickets' from origin 'http://dashboard.example.com' has been blocked by CORS policy
```

**Fix**:

**Backend** (`src/main.ts`):
```typescript
// Development - allow all
app.enableCors({ origin: true, credentials: true });

// Production - restrict to frontend domain
app.enableCors({ 
  origin: process.env.FRONTEND_URL || 'https://dashboard.example.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
});
```

**Frontend**: Ensure requests include credentials if needed
```typescript
const client = axios.create({ 
  baseURL: API_BASE,
  withCredentials: true  // If using cookies
});
```

### Fix 4: Cross-Tenant Access

**Symptoms**: 404 or empty results when accessing resources

**Diagnosis**:
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User tenant:', payload.tenantId);
```

**Fix**: Ensure user is accessing resources from their own tenant. The system automatically filters by tenantId from the JWT token. If you need to access another tenant, you need:
1. A token with that tenant's tenantId
2. Proper permissions in that tenant

### Fix 5: Comment/Attachment Ownership

**Symptoms**: 403 when editing or deleting comments/attachments with message "You can only edit/delete your own ..."

**Diagnosis**: Compare the resource's authorUserId with your token's sub claim
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Your user ID:', payload.sub);
```

**Fix**:
1. **Option A**: Only edit/delete your own resources
2. **Option B**: Use ADMIN role to bypass ownership checks (for comments, delete only)
3. **Option C**: Modify service logic to allow ADMIN to edit (code change required)

### Fix 6: Rate Limiting

**Symptoms**: Requests fail after working fine, especially during testing or bulk operations

**Diagnosis**: Check response headers
```bash
curl -i http://localhost:3000/tickets
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining
```

**Fix**:
1. **Immediate**: Wait 60 seconds for limit to reset
2. **Short-term**: Reduce request frequency in frontend
3. **Long-term**: Adjust throttler config in `app.module.ts`:
```typescript
ThrottlerModule.forRoot([{ 
  ttl: 60,      // Time window in seconds
  limit: 300    // Increase from 120 to 300
}])
```

### Fix 7: Environment Variable Misconfiguration

**Symptoms**: API calls go to wrong server or fail to connect

**Diagnosis**: Check environment variables
```bash
# Frontend
cat ticketing-suite/ticketing-dashboard/.env
# Should have: VITE_API_BASE=http://localhost:3000

# Backend
cat ticketing-suite/ticketing/.env
# Should have: JWT_SECRET, DATABASE_URL, etc.
```

**Fix**: Create or update `.env` files (see Environment Variables section)

## Environment Variables

### Backend (.env in ticketing-suite/ticketing/)

```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/tickets"
JWT_SECRET="your-secret-key-here"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Optional - OIDC (Production)
OIDC_ISSUER="https://your-oidc-provider.com"
OIDC_AUDIENCE="your-api-audience"
TENANT_CLAIM="tid"
ROLE_CLAIM="roles"

# Optional - S3 (for attachments)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="your-bucket-name"

# Optional - OpenSearch (for full-text search)
OPENSEARCH_NODE="http://localhost:9200"
OPENSEARCH_USERNAME="admin"
OPENSEARCH_PASSWORD="admin"

# Optional
PORT="3000"
NODE_ENV="development"
```

### Frontend (.env in ticketing-suite/ticketing-dashboard/)

```bash
# Required
VITE_API_BASE="http://localhost:3000"

# Optional
VITE_WS_BASE="ws://localhost:3000"
```

### Validation Script

Create this script to validate environment variables:

```bash
#!/bin/bash
# validate-env.sh

echo "Checking Backend Environment..."
cd ticketing-suite/ticketing

if [ ! -f .env ]; then
  echo "❌ Backend .env file not found"
else
  echo "✅ Backend .env file exists"
  
  # Check required variables
  for var in DATABASE_URL JWT_SECRET REDIS_HOST; do
    if grep -q "^${var}=" .env; then
      echo "✅ $var is set"
    else
      echo "❌ $var is missing"
    fi
  done
fi

echo ""
echo "Checking Frontend Environment..."
cd ../ticketing-dashboard

if [ ! -f .env ]; then
  echo "⚠️  Frontend .env file not found (will use defaults)"
else
  echo "✅ Frontend .env file exists"
  
  if grep -q "^VITE_API_BASE=" .env; then
    API_BASE=$(grep "^VITE_API_BASE=" .env | cut -d'=' -f2)
    echo "✅ VITE_API_BASE is set to: $API_BASE"
  else
    echo "⚠️  VITE_API_BASE not set (will use default: http://localhost:3000)"
  fi
fi
```

## Deployment Notes

### Render Deployment

When deploying to Render:

1. **Backend Service**:
   - Set environment variables in Render dashboard
   - Ensure `FRONTEND_URL` is set to your dashboard URL
   - Update CORS configuration to use `FRONTEND_URL`
   - Set `OIDC_ISSUER` and `OIDC_AUDIENCE` for production auth
   - Use Render's provided `DATABASE_URL` for PostgreSQL

2. **Frontend Service**:
   - Set `VITE_API_BASE` to your backend URL (e.g., `https://api.example.com`)
   - Build command: `npm run build`
   - Publish directory: `dist`

### Netlify Deployment

When deploying to Netlify:

1. **Frontend**:
   - Set `VITE_API_BASE` in Netlify environment variables
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Common Issues**:
   - **Proxy 403**: If using Netlify Functions as a proxy, ensure proper authentication forwarding
   - **CORS**: Backend must allow Netlify domain in CORS configuration
   - **Build-time env**: Vite requires env vars at build time, not runtime

### Docker Deployment

When using docker-compose:

1. Update `docker-compose.yml` to include environment variables
2. Ensure frontend can reach backend via service name or host network
3. Configure CORS to allow container-to-container communication

### Health Check Endpoint

Always ensure `/health` is accessible without authentication for load balancer health checks:

```typescript
// In health.controller.ts - already configured
@Controller('health')
export class HealthController {
  @Get()  // No guards
  @HealthCheck()
  check() { ... }
}
```

### Monitoring 403 Errors

Add logging for 403 errors:

```typescript
// In exception filter or interceptor
if (status === 403) {
  logger.warn('403 Forbidden', {
    path: request.url,
    method: request.method,
    user: request.user?.sub,
    tenant: request.user?.tenantId,
    roles: request.user?.roles,
    ip: request.ip
  });
}
```

## Summary Checklist

Before reporting a 403 error as a bug, verify:

- [ ] Token exists in localStorage/sessionStorage
- [ ] Token is not expired (check `exp` claim)
- [ ] Token includes `sub`, `tenantId`, and `roles`
- [ ] User has the required role for the endpoint (ADMIN or USER)
- [ ] Request includes `Authorization: Bearer <token>` header
- [ ] API base URL is correct (check VITE_API_BASE)
- [ ] Not hitting rate limits (120 requests per 60 seconds)
- [ ] Not trying to edit/delete resources owned by others
- [ ] Not trying to access resources from a different tenant
- [ ] Backend is running and accessible
- [ ] CORS is properly configured if accessing from different origin
- [ ] Environment variables are set correctly on both frontend and backend

## Quick Reference: Route Permissions

| Endpoint | Method | Roles Required | Notes |
|----------|--------|---------------|-------|
| /health | GET | None | Public endpoint |
| /auth/login | POST | None | Public endpoint |
| /auth/register | POST | ADMIN | Create new users |
| /tickets | GET | ADMIN, USER | List tickets |
| /tickets | POST | ADMIN, USER | Create ticket |
| /tickets/:id | GET | ADMIN, USER | Get ticket |
| /tickets/:id | PATCH | ADMIN, USER | Update ticket |
| /tickets/:id/history | GET | ADMIN, USER | Ticket history |
| /tickets/:id/comments | * | ADMIN, USER | Comment operations |
| /tickets/:id/attachments | * | ADMIN, USER | Attachment operations |
| /directory/sites | GET | ADMIN, USER | List sites |
| /directory/sites | POST | ADMIN | Create site |
| /directory/sites/:id | PATCH | ADMIN | Update site |
| /directory/sites/:id | DELETE | ADMIN | Delete site |
| /directory/users | GET | ADMIN, USER | List users |
| /users/:id | PATCH | ADMIN | Update user |
| /users/:id | DELETE | ADMIN | Delete user |
| /users/profile | PATCH | ADMIN, USER | Update own profile |
| /users/profile/change-password | POST | ADMIN, USER | Change own password |
| /directory/issue-types | GET | ADMIN, USER | List issue types |
| /directory/issue-types | POST | ADMIN | Create issue type |
| /directory/field-definitions | GET | ADMIN, USER | List field definitions |
| /directory/field-definitions | POST | ADMIN | Create field definition |

## Support

If you've followed this guide and still experience 403 errors:

1. Capture the full request/response (use browser DevTools Network tab)
2. Decode your JWT token and share the payload (without the signature)
3. Share the exact endpoint and method you're calling
4. Share any error messages from the browser console
5. Share any error logs from the backend server
6. Share your environment configuration (without secrets)

