-- Commerce + portals: multi-item orders with separate payment / fulfillment status, payments,
-- coupons, deliveries (R2 files, GitHub access), customer accounts with passwords, support
-- tickets, email events and settings. Existing single-product orders are migrated in place.

-- ─────────────── Enums ───────────────
CREATE TYPE "ProductType" AS ENUM ('SOFTWARE', 'DIGITAL_PRODUCT', 'SOURCE_CODE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_REQUIRED');
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'FAILED', 'COMPLETED');
CREATE TYPE "OrderSource" AS ENUM ('CHECKOUT', 'ADMIN');
CREATE TYPE "DeliveryType" AS ENUM ('R2', 'GITHUB');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ACTION_REQUIRED', 'READY', 'INVITATION_SENT', 'ACCEPTED', 'EXPIRED', 'FAILED', 'REVOKED');
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "CustomerTokenPurpose" AS ENUM ('LOGIN_LINK', 'VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "MessageAuthor" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';

-- ─────────────── New tables ───────────────
CREATE TABLE "CustomerToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purpose" "CustomerTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "providerRef" TEXT,
    "providerPaymentId" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "DeliveryType" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "githubOwner" TEXT,
    "githubRepo" TEXT,
    "githubUserId" TEXT,
    "githubLogin" TEXT,
    "githubInvitationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "productId" TEXT,
    "orderId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "MessageAuthor" NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "attachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "ticketId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "_CouponProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CouponProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- ─────────────── Products ───────────────
ALTER TABLE "Product" ADD COLUMN "compareAtPrice" INTEGER,
ADD COLUMN "deliverFiles" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deliverGithub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "description" TEXT,
ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "githubOwner" TEXT,
ADD COLUMN "githubRepo" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'DIGITAL_PRODUCT',
ADD COLUMN "version" TEXT;

-- Products that already had files deliver them through R2.
UPDATE "Product" p SET "deliverFiles" = true
WHERE EXISTS (SELECT 1 FROM "ProductFile" f WHERE f."productId" = p."id");
UPDATE "Product" SET "publishedAt" = "updatedAt" WHERE "status" = 'PUBLISHED';

ALTER TABLE "ProductFile" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "version" TEXT;

-- ─────────────── Customers ───────────────
ALTER TABLE "Customer" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "githubConnectedAt" TIMESTAMP(3),
ADD COLUMN "githubId" TEXT,
ADD COLUMN "githubLogin" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';

-- Magic-link tokens are short-lived; they are replaced by the purpose-tagged token table.
ALTER TABLE "CustomerLoginToken" DROP CONSTRAINT "CustomerLoginToken_customerId_fkey";
DROP TABLE "CustomerLoginToken";

ALTER TABLE "ProcessedWebhookEvent" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'stripe';

-- ─────────────── Orders: migrate single-product orders ───────────────
ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "couponId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "note" TEXT,
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'CHECKOUT',
ADD COLUMN "subtotal" INTEGER,
ADD COLUMN "total" INTEGER;

INSERT INTO "OrderItem" ("id", "orderId", "productId", "productName", "productSlug", "productType",
                         "unitPrice", "quantity", "discount", "total", "createdAt")
SELECT gen_random_uuid()::text, o."id", o."productId", p."name", p."slug", p."type",
       o."amount", 1, 0, o."amount", o."createdAt"
FROM "Order" o JOIN "Product" p ON p."id" = o."productId";

INSERT INTO "Payment" ("id", "orderId", "provider", "status", "amount", "currency", "providerRef",
                       "providerPaymentId", "paidAt", "refundedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", o."provider",
       (CASE
          WHEN o."provider" = 'FREE' THEN 'NOT_REQUIRED'
          WHEN o."status" = 'PAID' THEN 'PAID'
          WHEN o."status" = 'REFUNDED' THEN 'REFUNDED'
          WHEN o."status" = 'FAILED' THEN 'FAILED'
          ELSE 'PENDING'
        END)::"PaymentStatus",
       o."amount", o."currency", o."providerRef", o."paymentRef", o."paidAt", o."refundedAt",
       o."createdAt", o."updatedAt"
FROM "Order" o;

-- Paid orders of products with files already had download access.
INSERT INTO "Delivery" ("id", "orderId", "orderItemId", "customerId", "productId", "type", "status",
                        "deliveredAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", i."id", o."customerId", o."productId", 'R2', 'READY',
       COALESCE(o."paidAt", o."updatedAt"), o."createdAt", o."updatedAt"
FROM "Order" o
JOIN "OrderItem" i ON i."orderId" = o."id"
WHERE o."status" = 'PAID'
  AND EXISTS (SELECT 1 FROM "ProductFile" f WHERE f."productId" = o."productId");

UPDATE "Order" SET
  "subtotal" = "amount",
  "total" = "amount",
  "paymentStatus" = (CASE
      WHEN "provider" = 'FREE' THEN 'NOT_REQUIRED'
      WHEN "status" = 'PAID' THEN 'PAID'
      WHEN "status" = 'REFUNDED' THEN 'REFUNDED'
      WHEN "status" = 'FAILED' THEN 'FAILED'
      ELSE 'PENDING'
    END)::"PaymentStatus",
  "fulfillmentStatus" = (CASE WHEN "status" = 'PAID' THEN 'DELIVERED' ELSE 'PENDING' END)::"FulfillmentStatus",
  "completedAt" = (CASE WHEN "status" = 'PAID' THEN "paidAt" ELSE NULL END),
  "cancelledAt" = (CASE WHEN "status" = 'FAILED' THEN "updatedAt" ELSE NULL END);

-- Order status: PAID orders were already delivered (COMPLETED); FAILED (expired checkout) → CANCELLED.
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'PAID' THEN 'COMPLETED'
    WHEN 'FAILED' THEN 'CANCELLED'
    ELSE "status"::text
  END
)::"OrderStatus_new";
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";
DROP INDEX "Order_productId_idx";
DROP INDEX "Order_providerRef_key";
ALTER TABLE "Order" DROP COLUMN "amount",
DROP COLUMN "paymentRef",
DROP COLUMN "productId",
DROP COLUMN "providerRef";
ALTER TABLE "Order" ALTER COLUMN "subtotal" SET NOT NULL,
ALTER COLUMN "total" SET NOT NULL;

-- ─────────────── Indexes ───────────────
CREATE UNIQUE INDEX "CustomerToken_tokenHash_key" ON "CustomerToken"("tokenHash");
CREATE INDEX "CustomerToken_customerId_purpose_idx" ON "CustomerToken"("customerId", "purpose");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");
CREATE INDEX "Delivery_customerId_type_idx" ON "Delivery"("customerId", "type");
CREATE INDEX "Delivery_githubOwner_githubRepo_githubUserId_idx" ON "Delivery"("githubOwner", "githubRepo", "githubUserId");
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");
CREATE UNIQUE INDEX "Delivery_orderItemId_type_key" ON "Delivery"("orderItemId", "type");
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");
CREATE INDEX "SupportTicket_status_lastMessageAt_idx" ON "SupportTicket"("status", "lastMessageAt");
CREATE INDEX "SupportTicket_customerId_idx" ON "SupportTicket"("customerId");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE UNIQUE INDEX "EmailEvent_idempotencyKey_key" ON "EmailEvent"("idempotencyKey");
CREATE INDEX "EmailEvent_createdAt_idx" ON "EmailEvent"("createdAt");
CREATE INDEX "EmailEvent_customerId_idx" ON "EmailEvent"("customerId");
CREATE INDEX "EmailEvent_orderId_idx" ON "EmailEvent"("orderId");
CREATE INDEX "_CouponProducts_B_index" ON "_CouponProducts"("B");
CREATE UNIQUE INDEX "Customer_githubId_key" ON "Customer"("githubId");

-- ─────────────── Foreign keys ───────────────
ALTER TABLE "CustomerToken" ADD CONSTRAINT "CustomerToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_CouponProducts" ADD CONSTRAINT "_CouponProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CouponProducts" ADD CONSTRAINT "_CouponProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
