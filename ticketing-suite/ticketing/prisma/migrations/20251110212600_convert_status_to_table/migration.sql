-- CreateTable
CREATE TABLE "Status" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Status_tenantId_key_key" ON "Status"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default statuses for all tenants based on existing enum values
INSERT INTO "Status" (id, "tenantId", key, label, active)
SELECT gen_random_uuid(), id, 'AWAITING_RESPONSE', 'Awaiting Response', true
FROM "Tenant"
ON CONFLICT DO NOTHING;

INSERT INTO "Status" (id, "tenantId", key, label, active)
SELECT gen_random_uuid(), id, 'ADE_TO_RESPOND', 'ADE to Respond', true
FROM "Tenant"
ON CONFLICT DO NOTHING;

INSERT INTO "Status" (id, "tenantId", key, label, active)
SELECT gen_random_uuid(), id, 'ON_HOLD', 'On Hold', true
FROM "Tenant"
ON CONFLICT DO NOTHING;

INSERT INTO "Status" (id, "tenantId", key, label, active)
SELECT gen_random_uuid(), id, 'CLOSED', 'Closed', true
FROM "Tenant"
ON CONFLICT DO NOTHING;

-- Rename status column to statusKey to hold the status key reference
ALTER TABLE "Ticket" RENAME COLUMN "status" TO "statusKey";

-- Change statusKey column type from enum to text
ALTER TABLE "Ticket" ALTER COLUMN "statusKey" TYPE TEXT;

-- Drop the old TicketStatus enum
DROP TYPE "TicketStatus";

-- Recreate the index with the new column name
DROP INDEX IF EXISTS "Ticket_tenantId_status_priority_createdAt_idx";
CREATE INDEX "Ticket_tenantId_statusKey_priority_createdAt_idx" ON "Ticket"("tenantId", "statusKey", "priority", "createdAt");
