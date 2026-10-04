-- CreateEnum
CREATE TYPE "AnalyticsDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "anonymousId" TEXT,
ADD COLUMN     "firstCampaign" TEXT,
ADD COLUMN     "firstContent" TEXT,
ADD COLUMN     "firstLandingPage" TEXT,
ADD COLUMN     "firstMedium" TEXT,
ADD COLUMN     "firstReferrer" TEXT,
ADD COLUMN     "firstSource" TEXT,
ADD COLUMN     "firstTerm" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "firstCampaign" TEXT,
ADD COLUMN     "firstContent" TEXT,
ADD COLUMN     "firstMedium" TEXT,
ADD COLUMN     "firstSource" TEXT,
ADD COLUMN     "firstTerm" TEXT,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "lastCampaign" TEXT,
ADD COLUMN     "lastContent" TEXT,
ADD COLUMN     "lastMedium" TEXT,
ADD COLUMN     "lastSource" TEXT,
ADD COLUMN     "lastTerm" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "tracking" JSONB;

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'server',
    "customerId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "orderId" TEXT,
    "productId" TEXT,
    "value" INTEGER,
    "currency" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "term" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "pageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDelivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "AnalyticsDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_eventId_key" ON "AnalyticsEvent"("eventId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_name_idx" ON "AnalyticsEvent"("productId", "name");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_anonymousId_idx" ON "AnalyticsEvent"("anonymousId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_customerId_idx" ON "AnalyticsEvent"("customerId");

-- CreateIndex
CREATE INDEX "AnalyticsDelivery_status_idx" ON "AnalyticsDelivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDelivery_eventId_provider_key" ON "AnalyticsDelivery"("eventId", "provider");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsDelivery" ADD CONSTRAINT "AnalyticsDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AnalyticsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

