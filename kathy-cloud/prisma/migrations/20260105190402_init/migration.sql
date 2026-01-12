-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('initiated', 'pending', 'paid_pending_consent', 'paid_and_confirmed', 'cancelled', 'failed', 'manual_review');

-- CreateTable
CREATE TABLE "payment_sessions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'initiated',
    "practice_panther_invoice_url" TEXT,
    "firm_id" TEXT,
    "user_id" TEXT,
    "processor_payment_id" TEXT,
    "payment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "payment_session_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_sessions_processor_payment_id_key" ON "payment_sessions"("processor_payment_id");

-- CreateIndex
CREATE INDEX "payment_sessions_invoice_id_idx" ON "payment_sessions"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_sessions_status_idx" ON "payment_sessions"("status");

-- CreateIndex
CREATE INDEX "audit_logs_payment_session_id_idx" ON "audit_logs"("payment_session_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_payment_session_id_fkey" FOREIGN KEY ("payment_session_id") REFERENCES "payment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
