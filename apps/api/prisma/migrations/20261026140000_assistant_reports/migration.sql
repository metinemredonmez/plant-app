-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('WRONG', 'UNSAFE', 'OFF_TOPIC', 'OTHER');

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "report_note" TEXT,
ADD COLUMN     "report_reason" "ReportReason",
ADD COLUMN     "reported_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "chat_messages_reported_at_idx" ON "chat_messages"("reported_at");

