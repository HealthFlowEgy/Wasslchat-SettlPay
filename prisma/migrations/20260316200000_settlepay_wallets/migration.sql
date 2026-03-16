-- SettlePay Wallet Integration
CREATE TABLE "settlepay_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "owner_type" TEXT NOT NULL,
    "settlepay_member_id" TEXT NOT NULL,
    "settlepay_wallet_id" TEXT NOT NULL,
    "wallet_type" TEXT NOT NULL DEFAULT 'MAIN',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settlepay_wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settlepay_wallets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "settlepay_wallets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
);

CREATE UNIQUE INDEX "settlepay_wallets_settlepay_wallet_id_key" ON "settlepay_wallets"("settlepay_wallet_id");
CREATE INDEX "settlepay_wallets_tenant_id_owner_type_idx" ON "settlepay_wallets"("tenant_id", "owner_type");
CREATE INDEX "settlepay_wallets_tenant_id_contact_id_idx" ON "settlepay_wallets"("tenant_id", "contact_id");
