-- AddColumn: password reset token fields to users table
ALTER TABLE "users" ADD COLUMN "reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN "reset_token_expires_at" TIMESTAMP(3);

-- Index for fast lookup during reset flow
CREATE INDEX "users_reset_token_idx" ON "users"("reset_token");
