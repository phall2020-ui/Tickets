#!/bin/bash
# This script resolves failed migrations in production databases
# It should be run before prisma migrate deploy

echo "🔍 Checking for failed migrations..."

# Check migration status
MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)

# Check for P3009 error (failed migration found)
if echo "$MIGRATE_STATUS" | grep -q "P3009"; then
  echo "⚠️  Found failed migration(s)"
  echo "$MIGRATE_STATUS"
  
  # Extract the migration name from the error message
  # Expected format: "The `migration_name` migration started at YYYY-MM-DD HH:MM:SS UTC failed"
  MIGRATION_NAME=$(echo "$MIGRATE_STATUS" | sed -n 's/.*`\([^`]*\)`.*/\1/p' | head -1)
  
  if [ -n "$MIGRATION_NAME" ]; then
    echo "🔧 Attempting to resolve failed migration: $MIGRATION_NAME"
    
    # Strategy 1: Try to mark as rolled-back (safest option)
    echo "  Trying to mark as rolled-back..."
    if npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" 2>/dev/null; then
      echo "✅ Successfully marked migration as rolled-back"
      echo "   Migration will be re-applied on next deploy"
    else
      # Strategy 2: Try to mark as applied (if migration actually succeeded)
      echo "  Could not mark as rolled-back, trying to mark as applied..."
      if npx prisma migrate resolve --applied "$MIGRATION_NAME" 2>/dev/null; then
        echo "✅ Successfully marked migration as applied"
      else
        # Strategy 3: Fall back to environment variable override
        echo "⚠️  Automatic resolution failed"
        echo "💡 The migration deploy will continue, but may fail"
        echo "   Manual resolution may be required:"
        echo "   - Check database state manually"
        echo "   - Use: npx prisma migrate resolve --applied $MIGRATION_NAME"
        echo "   - Or:  npx prisma migrate resolve --rolled-back $MIGRATION_NAME"
        
        # Don't exit with error - let the deploy attempt continue
        exit 0
      fi
    fi
  else
    echo "⚠️  Could not extract migration name from status"
    echo "   Continuing with deploy attempt..."
    exit 0
  fi
elif echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
  echo "✅ Database schema is up to date"
elif echo "$MIGRATE_STATUS" | grep -q "migrations found"; then
  echo "📋 Pending migrations found, will be applied by migrate deploy"
else
  echo "ℹ️  Migration status check completed"
fi

exit 0
