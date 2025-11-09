# 403 Error Troubleshooting Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    403 Error Troubleshooting System                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  Documentation   │  │  Diagnostic      │  │  Testing             │
│                  │  │  Tools           │  │                      │
│ • Full Guide     │  │ • diagnose-403   │  │ • E2E Test Suite    │
│ • Quick Ref      │  │ • validate-env   │  │ • 40+ Test Cases    │
│ • Summary        │  │ • Token Utils    │  │ • All Scenarios     │
│ • Examples       │  │ • Curl Commands  │  │ • CI/CD Ready       │
└────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘
         │                     │                        │
         └─────────────────────┼────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   User Problem      │
                    │   "403 Forbidden"   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │   Diagnostic Flow                   │
                    │                                      │
                    │  1. Check token existence           │
                    │  2. Decode token payload            │
                    │  3. Verify roles                    │
                    │  4. Check endpoint requirements     │
                    │  5. Test with curl                  │
                    │  6. Run automated diagnostics       │
                    └──────────┬──────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼─────────┐   ┌──────▼──────┐
│ Authentication │   │ Authorization     │   │ Environment │
│ Issues (401)   │   │ Issues (403)      │   │ Issues      │
│                │   │                   │   │             │
│ • No token     │   │ • Wrong role      │   │ • Wrong URL │
│ • Invalid      │   │ • Ownership       │   │ • CORS      │
│ • Expired      │   │ • Cross-tenant    │   │ • Config    │
└───────┬────────┘   └─────────┬─────────┘   └──────┬──────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Solution Applied  │
                    └─────────────────────┘
```

## Component Relationships

### Documentation Layer

```
TROUBLESHOOTING_403_ERRORS.md (Master Document)
           │
           ├─► Quick Diagnosis Steps
           ├─► Root Cause Tables
           ├─► Fix Plans
           ├─► Testing Procedures
           └─► Deployment Guidance
                      │
        ┌─────────────┴─────────────┐
        │                           │
403_QUICK_REFERENCE.md    403_IMPLEMENTATION_SUMMARY.md
(Quick Help)              (Technical Details)
```

### Tool Chain

```
User Issue
    │
    ▼
Browser Console Commands
    │ (Quick checks)
    ▼
diagnose-403.sh
    │ (Automated diagnosis)
    ├─► Backend Connectivity Test
    ├─► Token Generation & Analysis
    ├─► Auth Scenario Testing
    ├─► CORS Validation
    └─► Rate Limit Check
         │
         ▼
validate-env.sh
    │ (Environment validation)
    ├─► Required Variables Check
    ├─► Database Connection Test
    ├─► Redis Connection Test
    └─► Production Config Review
         │
         ▼
E2E Test Suite
    │ (Verification)
    └─► 403-errors.e2e-spec.ts
```

## Request Flow with 403 Prevention

```
Frontend (React)                    Backend (NestJS)
     │                                    │
     │ 1. User Action                    │
     │    (e.g., Create Site)            │
     │                                    │
     │ 2. Check if ADMIN                 │
     │    (hasRole('ADMIN'))             │
     │    ❌ Not ADMIN?                   │
     │    → Show UI message              │
     │    ✅ Is ADMIN? → Continue         │
     │                                    │
     │ 3. Get token from localStorage    │
     │    ❌ No token?                     │
     │    → Redirect to login            │
     │    ✅ Has token? → Continue        │
     │                                    │
     │ 4. axios.post('/directory/sites') │
     │    Authorization: Bearer <token>  │
     ├────────────────────────────────►  │
     │                                    │ 5. JwtAuthGuard
     │                                    │    • Decode token
     │                                    │    • Extract user info
     │                                    │    ❌ Invalid? → 401
     │                                    │    ✅ Valid? → Continue
     │                                    │
     │                                    │ 6. RolesGuard
     │                                    │    • Check @Roles('ADMIN')
     │                                    │    • Compare with user.roles
     │                                    │    ❌ No ADMIN? → 403
     │                                    │    ✅ Has ADMIN? → Continue
     │                                    │
     │                                    │ 7. Controller
     │                                    │    • Extract tenantId
     │                                    │    • Execute business logic
     │                                    │    • Return response
     │  ◄────────────────────────────────┤
     │                                    │
     │ 8. Success Response                │
     │    or Error Handler                │
     │                                    │
```

## Error Categories and Solutions

```
403 Error Categories
        │
        ├─► Authentication (401)
        │   └─► Solution: Re-login
        │
        ├─► RBAC (403)
        │   ├─► Wrong Role
        │   │   └─► Solution: Use ADMIN account or request upgrade
        │   └─► No Roles
        │       └─► Solution: Fix token generation
        │
        ├─► Cross-Tenant (404)
        │   └─► Solution: Use correct tenant account
        │
        ├─► Ownership (403)
        │   └─► Solution: Only modify own resources or use ADMIN
        │
        ├─► Rate Limiting (429)
        │   └─► Solution: Wait 60 seconds
        │
        └─► Environment (varies)
            ├─► Wrong API URL
            │   └─► Solution: Update VITE_API_BASE
            ├─► CORS Issue
            │   └─► Solution: Configure CORS in main.ts
            └─► Missing OIDC
                └─► Solution: Set OIDC vars or use dev mode
```

## Guard Decision Tree

```
Request Arrives
      │
      ▼
Has Authorization Header?
      │
      ├─► No  → 401 Unauthorized
      │
      ▼
      Yes
      │
      ▼
Valid JWT Format?
      │
      ├─► No  → 401 Unauthorized
      │
      ▼
      Yes
      │
      ▼
Token Verified? (OIDC in prod)
      │
      ├─► No  → 401 Unauthorized
      │
      ▼
      Yes
      │
      ▼
Extract: user.sub, user.tenantId, user.roles
      │
      ▼
Endpoint requires roles?
      │
      ├─► No  → ✅ Allow (Public endpoint)
      │
      ▼
      Yes (@Roles decorator)
      │
      ▼
User has required role?
      │
      ├─► No  → 403 Forbidden ("Insufficient role")
      │
      ▼
      Yes
      │
      ▼
Controller logic checks ownership?
      │
      ├─► Yes → Is owner or ADMIN?
      │         │
      │         ├─► No  → 403 Forbidden ("Not owner")
      │         │
      │         ▼
      │         Yes
      │
      ▼
✅ Request Allowed → Execute Handler
```

## Multi-Tenancy Isolation

```
Request with Token
      │
      └─► JWT Payload: { sub: "user1", tenantId: "tenant-A", ... }
            │
            ▼
      Controller extracts: req.user.tenantId = "tenant-A"
            │
            ▼
      Service/Repository Query
            │
            └─► WHERE tenantId = "tenant-A"
                  │
                  ▼
            Returns only tenant-A resources
                  │
                  ├─► Ticket belongs to tenant-B? → Not returned (404)
                  └─► Ticket belongs to tenant-A? → Returned (200)
```

## Test Coverage Map

```
403 Test Suite
      │
      ├─► 1. Authentication (401 vs 403)
      │   ├─ No token
      │   ├─ Malformed token
      │   ├─ Missing Bearer
      │   └─ Valid token ✓
      │
      ├─► 2. RBAC (403)
      │   ├─ USER → Create Site (ADMIN only)
      │   ├─ USER → Update User (ADMIN only)
      │   ├─ USER → Delete User (ADMIN only)
      │   ├─ USER → Register User (ADMIN only)
      │   ├─ Empty roles array
      │   ├─ ADMIN → Create Site ✓
      │   └─ USER → List Tickets ✓
      │
      ├─► 3. Multi-Tenancy
      │   ├─ Tenant-B → Access Tenant-A ticket
      │   ├─ Tenant-B → List Tenant-A sites
      │   ├─ Tenant-B → Update Tenant-A ticket
      │   └─ Tenant-B → Comment on Tenant-A ticket
      │
      ├─► 4. Ownership (403)
      │   ├─ User1 → Edit User2's comment
      │   ├─ User1 → Delete User2's comment
      │   ├─ User1 → Edit own comment ✓
      │   ├─ User1 → Delete own comment ✓
      │   └─ ADMIN → Delete any comment ✓
      │
      ├─► 5. CORS
      │   ├─ OPTIONS request handling
      │   └─ CORS headers present
      │
      ├─► 6. Edge Cases
      │   ├─ Public endpoints (no auth)
      │   ├─ Validation errors (400 not 403)
      │   └─ Non-existent resources (404 not 403)
      │
      └─► 7. Self-Service
          ├─ Update own profile ✓
          └─ Change own password ✓
```

## Deployment Architecture

```
Production Deployment

Frontend (Netlify/Vercel)          Backend (Render/Railway)
      │                                   │
      ├─ VITE_API_BASE ──────────────────►│
      │  = https://api.example.com        │
      │                                   │
      │                                   ├─ DATABASE_URL (Postgres)
      │                                   ├─ REDIS_URL
      │                                   ├─ JWT_SECRET
      │                                   ├─ OIDC_ISSUER
      │                                   ├─ OIDC_AUDIENCE
      │                                   ├─ FRONTEND_URL
      │                                   │  = https://dashboard.example.com
      │                                   │
      │                                   └─ CORS Config
User Request                                 origin: FRONTEND_URL
      │                                      credentials: true
      │
      ├─► https://dashboard.example.com
      │   (Frontend loads)
      │
      └─► API calls to https://api.example.com
          │
          ├─► CORS preflight OK?
          │   ├─ No  → CORS error in browser
          │   └─ Yes → Continue
          │
          ├─► Auth header present?
          │   ├─ No  → 401
          │   └─ Yes → Continue
          │
          ├─► JWT valid (via OIDC)?
          │   ├─ No  → 401
          │   └─ Yes → Continue
          │
          └─► Has required role?
              ├─ No  → 403
              └─ Yes → ✓ Success
```

## Quick Diagnostic Decision Tree

```
User reports: "I'm getting 403 Forbidden"
            │
            ▼
Step 1: Check token
            │
            ├─► No token? → Go to login
            │
            ▼
            Has token
            │
            ▼
Step 2: Decode token
            │
            ├─► No roles? → Contact admin to fix user
            ├─► Expired? → Re-login
            │
            ▼
            Token looks valid
            │
            ▼
Step 3: Check operation
            │
            ├─► Creating site/user/type? → Need ADMIN role
            ├─► Editing comment? → Must be owner or ADMIN
            ├─► Cross-tenant? → Need account in that tenant
            │
            ▼
            Should work...
            │
            ▼
Step 4: Run diagnostics
            │
            └─► ./scripts/diagnose-403.sh
                      │
                      └─► Follow specific recommendations
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    Application Code                      │
│                                                          │
│  Backend                         Frontend               │
│  ┌────────────┐                 ┌──────────┐           │
│  │  Guards    │                 │  Axios   │           │
│  │  • JWT     │                 │  • Token │           │
│  │  • Roles   │                 │  • Header│           │
│  └────┬───────┘                 └────┬─────┘           │
│       │                              │                  │
└───────┼──────────────────────────────┼──────────────────┘
        │                              │
        │  ┌────────────────────────┐  │
        └─►│  Troubleshooting       │◄─┘
           │  System                │
           │                        │
           │  • Documentation       │
           │  • Diagnostic Tools    │
           │  • Test Suite         │
           │  • Examples           │
           └────────────────────────┘
```

## Summary

This architecture provides:

1. **Layered Approach**: Documentation → Tools → Tests → Examples
2. **Multiple Entry Points**: Quick ref for speed, full guide for depth
3. **Automated Diagnosis**: Scripts handle the heavy lifting
4. **Comprehensive Testing**: 40+ test cases cover all scenarios
5. **Clear Decision Trees**: Visual guides for troubleshooting
6. **Production Ready**: Deployment guidance included

**Result**: Complete 403 error troubleshooting system that covers prevention, detection, diagnosis, and resolution.
