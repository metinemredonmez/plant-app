-- CreateEnum
CREATE TYPE "ScanLink" AS ENUM ('SECOND_PHOTO', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "Recovery" AS ENUM ('BETTER', 'SAME', 'WORSE');

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "correct" BOOLEAN,
ADD COLUMN     "feedback_at" TIMESTAMP(3),
ADD COLUMN     "link" "ScanLink",
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "recovery" "Recovery";

-- CreateIndex
CREATE INDEX "scans_parent_id_idx" ON "scans"("parent_id");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

