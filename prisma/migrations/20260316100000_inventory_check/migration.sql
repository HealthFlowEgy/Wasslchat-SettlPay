-- Prevent negative inventory at DB level
ALTER TABLE "products" ADD CONSTRAINT "products_inventory_non_negative" 
  CHECK ("inventory_quantity" >= 0);

-- Atomic coupon usage check  
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_used_within_max"
  CHECK ("max_uses" IS NULL OR "used_count" <= "max_uses");

-- Performance indexes for common queries
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at" DESC);
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);
CREATE INDEX "contacts_tenant_id_last_contacted_at_idx" ON "contacts"("tenant_id", "last_contacted_at" DESC NULLS LAST);
CREATE INDEX "conversations_tenant_id_last_message_at_idx" ON "conversations"("tenant_id", "last_message_at" DESC NULLS LAST);
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);
