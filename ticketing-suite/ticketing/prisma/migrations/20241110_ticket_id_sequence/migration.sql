-- Drop default UUID generation for ticket IDs; IDs will now be allocated manually.
ALTER TABLE "Ticket" ALTER COLUMN "id" DROP DEFAULT;

-- Create per-site ticket sequence table to track next ticket numbers and stable prefixes.
CREATE TABLE "SiteTicketSequence" (
  "siteId" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SiteTicketSequence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SiteTicketSequence_tenantId_idx" ON "SiteTicketSequence"("tenantId");

