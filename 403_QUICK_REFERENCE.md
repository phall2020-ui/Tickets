# 403 Error Quick Reference Card

## 🚨 Got a 403 Forbidden Error? Start Here!

### Step 1: Check Your Token (30 seconds)

Open browser console (F12) and run:
```javascript
// Check if token exists
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);

// If token exists, decode it
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('User ID:', payload.sub);
  console.log('Tenant ID:', payload.tenantId);
  console.log('Roles:', payload.roles);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

**No token?** → You need to log in first  
**Token expired?** → Log out and log in again  
**No roles?** → Contact admin to fix your account

---

### Step 2: Identify the Error Type (1 minute)

| Your Situation | Error Type | Solution |
|----------------|------------|----------|
| "Insufficient role" message | ❌ Wrong Role | Need ADMIN account for this operation |
| Can't edit/delete comment | ❌ Not Owner | You can only edit your own content |
| Can't see tickets/sites | ❌ Wrong Tenant | Check tenantId in your token |
| Works sometimes, fails others | ⏱️ Rate Limit | Wait 60 seconds, then retry |
| Just logged in, immediate 403 | 🔑 Token Issue | Clear localStorage and re-login |

---

### Step 3: Quick Fixes

#### Fix: "Insufficient role" (ADMIN operations)

**Operations requiring ADMIN:**
- Creating/editing sites
- Managing users
- Managing issue types
- Managing field definitions

**Solutions:**
1. Use an ADMIN account, or
2. Ask admin to upgrade your role, or
3. Use a USER-accessible alternative endpoint

#### Fix: Can't Edit/Delete Comments

**Problem:** You can only modify your own comments

**Check ownership:**
```javascript
// In browser console
console.log('Your user ID:', JSON.parse(atob(localStorage.getItem('token').split('.')[1])).sub);
// Compare with authorUserId of the comment
```

**Solutions:**
1. Only edit/delete your own comments
2. Use ADMIN account (can delete any comment)

#### Fix: Cross-Tenant Access

**Problem:** Can't see resources from another tenant

**This is by design!** Each tenant is isolated.

**Check your tenant:**
```javascript
// In browser console
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Your tenant ID:', payload.tenantId);
```

**Solutions:**
1. Log in with the correct tenant account
2. Resources belong to your tenant only

#### Fix: Rate Limiting

**Problem:** Too many requests in short time

**Current limit:** 120 requests per 60 seconds

**Solution:**
```javascript
// Wait 60 seconds
setTimeout(() => {
  console.log('You can try again now');
  location.reload();
}, 60000);
```

#### Fix: Invalid Token

**Problem:** Token is malformed or corrupted

**Solution:**
```javascript
// Clear all auth data
localStorage.removeItem('token');
sessionStorage.clear();
// Then log in again
location.href = '/login';
```

---

### Step 4: Run Diagnostics (2 minutes)

```bash
# Full system diagnostic
./scripts/diagnose-403.sh

# Check your specific token
./scripts/diagnose-403.sh check-token YOUR_TOKEN_HERE

# Validate environment
./scripts/validate-env.sh

# Generate a test admin token
./scripts/diagnose-403.sh generate-token admin-user tenant-1 ADMIN
```

---

### Step 5: Common Scenarios

#### Scenario: Trying to create a site

```
❌ Error: 403 Forbidden - "Insufficient role"
✅ Solution: This requires ADMIN role
```

**Quick test:**
```bash
# With USER token - will fail
curl -H "Authorization: Bearer $USER_TOKEN" \
     -X POST http://localhost:3000/directory/sites \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","location":"Test"}'

# With ADMIN token - will succeed
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -X POST http://localhost:3000/directory/sites \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","location":"Test"}'
```

#### Scenario: Editing someone else's comment

```
❌ Error: 403 Forbidden - "You can only edit your own comments"
✅ Solution: Only the comment author can edit (or ADMIN can delete)
```

#### Scenario: After deployment, all requests fail

```
❌ Likely: CORS or wrong API URL
```

**Check frontend config:**
```javascript
// In browser console
console.log('API Base:', import.meta.env.VITE_API_BASE);
```

**Fix:** Update `VITE_API_BASE` in deployment environment variables

---

### Emergency Checklist

- [ ] Token exists in localStorage
- [ ] Token is not expired
- [ ] Token has `roles` array with at least one role
- [ ] Using correct role for the operation (USER vs ADMIN)
- [ ] Not trying to modify others' resources
- [ ] Not hitting rate limit (< 120 req/min)
- [ ] API_BASE URL is correct
- [ ] Backend is running and accessible

---

## 📚 Full Documentation

For detailed troubleshooting, see:
- **[Complete 403 Troubleshooting Guide](./TROUBLESHOOTING_403_ERRORS.md)**
- **[README - Troubleshooting Section](./README.md#troubleshooting)**

## 🛠️ Tools

| Tool | Purpose |
|------|---------|
| `./scripts/diagnose-403.sh` | Automated 403 diagnostics |
| `./scripts/validate-env.sh` | Check environment config |
| Browser DevTools → Network | See actual request/response |
| Browser DevTools → Console | Check token and run commands |

---

## 🎯 Role Reference

| Endpoint Pattern | USER | ADMIN | Notes |
|------------------|------|-------|-------|
| `GET /tickets` | ✅ | ✅ | List tickets |
| `POST /tickets` | ✅ | ✅ | Create ticket |
| `GET /directory/sites` | ✅ | ✅ | List sites |
| `POST /directory/sites` | ❌ | ✅ | Create site |
| `PATCH /users/:id` | ❌ | ✅ | Update user |
| `POST /auth/register` | ❌ | ✅ | Register user |
| `PATCH /users/profile` | ✅ | ✅ | Update own profile |
| `GET /health` | 👤 | 👤 | Public (no auth) |

Legend: ✅ Allowed | ❌ Forbidden (403) | 👤 Public

---

**Still stuck?** Check the [full troubleshooting guide](./TROUBLESHOOTING_403_ERRORS.md) or run `./scripts/diagnose-403.sh`
