ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketFieldDef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Outbox" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_iso_tenant ON "Tenant"
  USING ("id" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_site ON "Site"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_user ON "User"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_ticket ON "Ticket"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_field ON "TicketFieldDef"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_comment ON "Comment"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_attachment ON "Attachment"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_iso_outbox ON "Outbox"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_insert_site ON "Site"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_user ON "User"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_ticket ON "Ticket"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_field ON "TicketFieldDef"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_comment ON "Comment"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_attachment ON "Attachment"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_insert_outbox ON "Outbox"
  FOR INSERT WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
