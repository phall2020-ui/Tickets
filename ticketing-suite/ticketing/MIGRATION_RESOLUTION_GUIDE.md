# Migration Failure Resolution Guide

## Problem

During deployment, Prisma migrations can fail due to various reasons:
- Network interruptions
- Database connection issues
- Schema conflicts
- Constraint violations

When a migration fails, Prisma records it in the `_prisma_migrations` table with a `failed` status. This prevents subsequent deployments from running new migrations, resulting in the **P3009** error:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `migration_name` migration started at YYYY-MM-DD HH:MM:SS UTC failed
```

## Solution

This repository includes an automatic migration resolution mechanism that runs during container startup.

### Automatic Resolution

The `start.sh` script now includes:

1. **Migration Status Check** - Checks for failed migrations before attempting to deploy
2. **Automatic Resolution** - Attempts to resolve failed migrations using two strategies:
   - **Rolled-back**: Marks the migration as rolled back, allowing it to be re-applied
   - **Applied**: Marks the migration as applied (if it actually succeeded but was marked as failed)

### How It Works

```bash
# During container startup:
1. Generate Prisma client
2. Check for failed migrations (resolve-failed-migrations.sh)
3. Attempt automatic resolution if failures found
4. Run prisma migrate deploy
5. Start the application
```

### Manual Resolution

If automatic resolution fails, you can manually resolve migrations:

#### Option 1: Mark as Rolled Back (Recommended)
```bash
npx prisma migrate resolve --rolled-back "migration_name"
```
This will allow the migration to be re-applied on the next deployment.

#### Option 2: Mark as Applied
```bash
npx prisma migrate resolve --applied "migration_name"
```
Use this if you've verified the migration changes are already in the database.

#### Option 3: Skip Migrations Temporarily
Set the `SKIP_MIGRATIONS=1` environment variable to skip the migration step and start the application anyway:
```bash
docker run -e SKIP_MIGRATIONS=1 your-image
```
⚠️ **Warning**: Use this only for debugging. The application may not work correctly if the schema is out of sync.

## Checking Migration Status

To check the status of your migrations:

```bash
# Inside the container or with DATABASE_URL set
npx prisma migrate status
```

This will show:
- ✅ Applied migrations
- ❌ Failed migrations
- 📋 Pending migrations

## Common Scenarios

### Scenario 1: Migration Failed Due to Timeout
**Resolution**: Mark as rolled-back and redeploy
```bash
npx prisma migrate resolve --rolled-back "migration_name"
```

### Scenario 2: Migration Partially Applied
**Resolution**: Check the database state, then either:
- Mark as applied if changes are in the database
- Mark as rolled-back and manually revert changes if needed

### Scenario 3: Migration Name Mismatch
If the migration name in the database differs from the repository:
1. Check the actual migration name: `npx prisma migrate status`
2. Use the exact name from the error message
3. Consider renaming the migration folder to match

## Prevention

To prevent migration failures:

1. **Test migrations locally** before deploying
2. **Use staging environments** to validate migrations
3. **Keep migrations small** and atomic
4. **Monitor deployment logs** for early warning signs
5. **Backup databases** before running migrations in production

## Files Involved

- `start.sh` - Container entrypoint with migration resolution logic
- `scripts/resolve-failed-migrations.sh` - Automatic migration resolution script
- `Dockerfile` - Includes scripts directory in the container image

## Additional Resources

- [Prisma Migrate Resolve](https://www.prisma.io/docs/concepts/components/prisma-migrate/resolve-migration-issues)
- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)
