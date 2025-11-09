# 403 Forbidden Errors - Documentation Index

> Complete guide to understanding, diagnosing, and resolving 403 Forbidden errors in the Tickets system

## 🚀 Quick Start

**Got a 403 error right now?** Start here:

1. **[Quick Reference Card](./403_QUICK_REFERENCE.md)** - 5-minute guide with instant solutions
2. Run diagnostic: `./scripts/diagnose-403.sh`
3. Follow the recommendations

## 📖 Documentation

### For Developers

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [Quick Reference](./403_QUICK_REFERENCE.md) | Instant help, common scenarios | 5 min |
| [Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md) | Complete reference with all details | 20 min |
| [Architecture](./403_ARCHITECTURE.md) | System design, diagrams, flows | 10 min |

### For DevOps/Admins

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [Environment Validation](./scripts/validate-env.sh) | Validate configuration | 2 min (script) |
| [Deployment Guide](./TROUBLESHOOTING_403_ERRORS.md#deployment-notes) | Platform-specific setup | 10 min |
| [Implementation Summary](./403_IMPLEMENTATION_SUMMARY.md) | Technical overview | 15 min |

### For QA/Testing

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [Test Suite](./ticketing-suite/ticketing/test/403-errors.e2e-spec.ts) | E2E tests for all scenarios | 10 min (read), 2 min (run) |
| [Testing Section](./TROUBLESHOOTING_403_ERRORS.md#testing--verification) | Manual testing procedures | 5 min |

## 🛠️ Tools

### Diagnostic Tools

```bash
# Full automated diagnosis
./scripts/diagnose-403.sh

# Check a specific JWT token
./scripts/diagnose-403.sh check-token <your-token>

# Generate a test token
./scripts/diagnose-403.sh generate-token admin-user tenant-1 ADMIN

# Show help
./scripts/diagnose-403.sh help
```

### Validation Tools

```bash
# Validate all environment variables
./scripts/validate-env.sh

# Use in CI/CD
./scripts/validate-env.sh && echo "Config OK" || echo "Config ERROR"
```

### Browser Console

```javascript
// Check if you have a token
localStorage.getItem('token')

// Decode your token to see its contents
JSON.parse(atob(localStorage.getItem('token').split('.')[1]))

// Clear token and re-login
localStorage.removeItem('token'); location.href = '/login'

// Check if token is expired
Date.now() >= JSON.parse(atob(localStorage.getItem('token').split('.')[1])).exp * 1000
```

## 🧪 Testing

### Run E2E Tests

```bash
cd ticketing-suite/ticketing

# Run all 403 error tests
npm run test:e2e -- --testNamePattern="403"

# Run all E2E tests
npm run test:e2e
```

### Test Coverage

- ✅ Authentication errors (401)
- ✅ RBAC insufficient role (403)
- ✅ Multi-tenancy isolation
- ✅ Resource ownership violations (403)
- ✅ CORS preflight handling
- ✅ Edge cases and special scenarios

**Total: 40+ test cases across 8 test suites**

## 📊 Quick Decision Tree

```
Have a 403 error?
       │
       ├─► 1. Do you have a token? → No? Go to login
       │                            → Yes? Continue
       │
       ├─► 2. Check token roles → Run: diagnose-403.sh check-token <token>
       │                        → Has ADMIN role for ADMIN endpoints?
       │                        → Has USER role for USER endpoints?
       │
       ├─► 3. Are you editing your own content?
       │      → Comments: Only owner can edit
       │      → Resources: Must belong to your tenant
       │
       └─► 4. Still stuck? → Run: ./scripts/diagnose-403.sh
                           → Follow specific recommendations
```

## 🎯 Common Scenarios

### Scenario 1: "Insufficient role" Error

**Problem**: USER trying to access ADMIN endpoint

**Solution**: Use ADMIN account or request role upgrade

**Details**: [Quick Reference - Fix: Insufficient role](./403_QUICK_REFERENCE.md#fix-insufficient-role-admin-operations)

### Scenario 2: Can't Edit Comment

**Problem**: Trying to edit another user's comment

**Solution**: Only edit your own comments, or use ADMIN account to delete

**Details**: [Quick Reference - Fix: Ownership](./403_QUICK_REFERENCE.md#fix-cant-editdelete-comments)

### Scenario 3: All Requests Failing After Deployment

**Problem**: CORS or wrong API URL

**Solution**: Check VITE_API_BASE and CORS configuration

**Details**: [Deployment Notes](./TROUBLESHOOTING_403_ERRORS.md#deployment-notes)

### Scenario 4: Can't See Tickets/Sites

**Problem**: Cross-tenant access or wrong tenant

**Solution**: Use account from correct tenant

**Details**: [Multi-Tenancy Section](./TROUBLESHOOTING_403_ERRORS.md#multi-tenancy-isolation)

### Scenario 5: Hit Rate Limit

**Problem**: Too many requests (120 per 60 seconds)

**Solution**: Wait 60 seconds and retry

**Details**: [Rate Limiting Section](./TROUBLESHOOTING_403_ERRORS.md#rate-limiting-throttlerguard)

## 📋 Checklists

### Developer Checklist

Before reporting a bug:

- [ ] Token exists in localStorage
- [ ] Token is not expired
- [ ] Token has roles array
- [ ] Role matches endpoint requirements (USER vs ADMIN)
- [ ] Not trying to modify others' resources
- [ ] Not accessing cross-tenant data
- [ ] API_BASE URL is correct
- [ ] Backend is running

### DevOps Checklist

Before deployment:

- [ ] Run `./scripts/validate-env.sh` successfully
- [ ] All required env vars set
- [ ] OIDC configured for production (or dev mode accepted)
- [ ] CORS allows frontend domain
- [ ] Database connection works
- [ ] Redis connection works
- [ ] Test with `./scripts/diagnose-403.sh`

### QA Checklist

Before release:

- [ ] E2E test suite passes (`npm run test:e2e`)
- [ ] Tested with USER role
- [ ] Tested with ADMIN role
- [ ] Verified cross-tenant isolation
- [ ] Verified ownership constraints
- [ ] Checked CORS from deployed frontend
- [ ] Validated rate limiting behavior

## 🔗 Reference Tables

### Endpoints by Role

| Endpoint | USER | ADMIN | Public |
|----------|------|-------|--------|
| GET /health | - | - | ✅ |
| POST /auth/login | - | - | ✅ |
| GET /tickets | ✅ | ✅ | - |
| POST /tickets | ✅ | ✅ | - |
| POST /directory/sites | - | ✅ | - |
| POST /auth/register | - | ✅ | - |
| PATCH /users/:id | - | ✅ | - |
| PATCH /users/profile | ✅ | ✅ | - |

**Full table**: [Route Permissions](./TROUBLESHOOTING_403_ERRORS.md#quick-reference-route-permissions)

### Error Categories

| Error | Status | Cause | Fix |
|-------|--------|-------|-----|
| No token | 401 | Not logged in | Go to login |
| Invalid token | 401 | Malformed JWT | Clear and re-login |
| Wrong role | 403 | USER on ADMIN endpoint | Use ADMIN account |
| Not owner | 403 | Edit others' content | Only edit own content |
| Wrong tenant | 404 | Cross-tenant access | Use correct tenant account |
| Rate limit | 429 | Too many requests | Wait 60 seconds |

## 📚 Additional Resources

### Environment Configuration

- [Backend .env.example](./ticketing-suite/ticketing/.env.example)
- [Frontend .env.example](./ticketing-suite/ticketing-dashboard/.env.example)
- [Validation Script](./scripts/validate-env.sh)

### Code Examples

- [Enhanced API Client](./ticketing-suite/ticketing-dashboard/src/lib/api-enhanced.ts.example) - Improved error handling

### Architecture

- [System Architecture](./403_ARCHITECTURE.md) - Visual diagrams and flows
- [Guard Decision Tree](./403_ARCHITECTURE.md#guard-decision-tree)
- [Request Flow](./403_ARCHITECTURE.md#request-flow-with-403-prevention)

## 🆘 Support

### I need help right now!

1. **[Quick Reference](./403_QUICK_REFERENCE.md)** - 5-minute read
2. `./scripts/diagnose-403.sh` - Automated diagnosis
3. Check browser console for token issues

### I want to understand the system

1. **[Architecture](./403_ARCHITECTURE.md)** - Visual overview
2. **[Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md)** - Complete reference
3. **[Implementation Summary](./403_IMPLEMENTATION_SUMMARY.md)** - Technical details

### I'm setting up deployment

1. **[Environment Examples](./ticketing-suite/ticketing/.env.example)** - Configuration
2. **[Validation Tool](./scripts/validate-env.sh)** - Verify setup
3. **[Deployment Notes](./TROUBLESHOOTING_403_ERRORS.md#deployment-notes)** - Platform-specific

### I'm writing tests

1. **[Test Suite](./ticketing-suite/ticketing/test/403-errors.e2e-spec.ts)** - Examples
2. **[Testing Guide](./TROUBLESHOOTING_403_ERRORS.md#testing--verification)** - Manual tests
3. Run: `npm run test:e2e -- --testNamePattern="403"`

## 📦 Files Overview

```
403 Error Documentation
│
├── 403_INDEX.md (this file)
│   └─ Central navigation hub
│
├── 403_QUICK_REFERENCE.md
│   └─ 5-minute quick help
│
├── TROUBLESHOOTING_403_ERRORS.md
│   └─ Complete 22KB guide
│
├── 403_ARCHITECTURE.md
│   └─ Visual diagrams and flows
│
├── 403_IMPLEMENTATION_SUMMARY.md
│   └─ Technical implementation details
│
├── scripts/
│   ├── diagnose-403.sh
│   │   └─ Automated diagnostic tool
│   └── validate-env.sh
│       └─ Environment validation
│
├── ticketing-suite/ticketing/
│   ├── .env.example
│   │   └─ Backend configuration template
│   └── test/403-errors.e2e-spec.ts
│       └─ 40+ E2E test cases
│
└── ticketing-suite/ticketing-dashboard/
    ├── .env.example
    │   └─ Frontend configuration template
    └── src/lib/api-enhanced.ts.example
        └─ Enhanced error handling example
```

## 🎓 Learning Path

### 1. New to the System? (30 minutes)

1. Read [Quick Reference](./403_QUICK_REFERENCE.md) (5 min)
2. Read [Architecture Overview](./403_ARCHITECTURE.md#system-overview) (10 min)
3. Run `./scripts/diagnose-403.sh` (5 min)
4. Browse [Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md) table of contents (10 min)

### 2. Need to Fix an Issue? (15 minutes)

1. Run `./scripts/diagnose-403.sh` (2 min)
2. Find your scenario in [Quick Reference](./403_QUICK_REFERENCE.md#common-scenarios) (5 min)
3. Apply the fix (5 min)
4. Verify with tests (3 min)

### 3. Setting Up Deployment? (30 minutes)

1. Copy and configure [.env.example](./ticketing-suite/ticketing/.env.example) files (10 min)
2. Run `./scripts/validate-env.sh` (2 min)
3. Read [Deployment Notes](./TROUBLESHOOTING_403_ERRORS.md#deployment-notes) (15 min)
4. Test with `./scripts/diagnose-403.sh` (3 min)

### 4. Deep Understanding? (60 minutes)

1. Read full [Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md) (30 min)
2. Study [Architecture Diagrams](./403_ARCHITECTURE.md) (15 min)
3. Review [Test Suite](./ticketing-suite/ticketing/test/403-errors.e2e-spec.ts) (15 min)

## 🚦 Status Indicators

When using the diagnostic tools, you'll see these indicators:

- ✅ **Green**: Everything is working correctly
- ⚠️ **Yellow**: Warning - may need attention but not critical
- ❌ **Red**: Error - needs to be fixed
- 👤 **Person**: Public endpoint (no auth required)

## 💡 Pro Tips

1. **Bookmark** the [Quick Reference](./403_QUICK_REFERENCE.md) for fast access
2. **Run diagnostics first** before diving deep into docs
3. **Check browser console** - it has valuable error messages
4. **Use the test suite** to verify your changes
5. **Keep environment examples** handy for deployment

## 📞 Getting Help

If you're still stuck after trying everything:

1. Check if backend is running: `curl http://localhost:3000/health`
2. Verify your token: `./scripts/diagnose-403.sh check-token <token>`
3. Run full diagnostics: `./scripts/diagnose-403.sh`
4. Review the specific error in [Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md)
5. Check your scenario in [Quick Reference](./403_QUICK_REFERENCE.md)

**Remember**: Most 403 errors are resolved in < 15 minutes with the right tools!

---

**Last Updated**: 2024 (Implementation complete)  
**Status**: Production Ready ✅  
**Total Documentation**: ~100KB  
**Test Coverage**: 40+ E2E test cases  
**Tools**: 2 automated scripts  
