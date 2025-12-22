-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('ONE_TIME_PLAN', 'QUERY_BOOSTER', 'MANUAL_GRANT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED');

-- AlterTable: Add new columns to Subscription
ALTER TABLE "Subscription" ADD COLUMN "billingType" "BillingType" NOT NULL DEFAULT 'SUBSCRIPTION';
ALTER TABLE "Subscription" ADD COLUMN "bonusQueryQuota" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add new columns to PlanConfig
ALTER TABLE "PlanConfig" ADD COLUMN "oneTimePriceEur" DOUBLE PRECISION;
ALTER TABLE "PlanConfig" ADD COLUMN "stripeOneTimePriceId" TEXT;

-- CreateTable: Purchase
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "productType" "PurchaseType" NOT NULL,
    "productName" TEXT NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "queriesIncluded" INTEGER NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripePaymentIntentId_key" ON "Purchase"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Purchase_organizationId_idx" ON "Purchase"("organizationId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_productType_idx" ON "Purchase"("productType");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
