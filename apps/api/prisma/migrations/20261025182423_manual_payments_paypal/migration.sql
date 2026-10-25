-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'PAYPAL';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentDueAt" TIMESTAMP(3),
ADD COLUMN     "paymentRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" TEXT,
ADD COLUMN     "methodDetails" JSONB,
ADD COLUMN     "proofId" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "senderAccount" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
