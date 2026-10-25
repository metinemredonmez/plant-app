-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "chargeable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "image_hash" TEXT;

-- CreateIndex
CREATE INDEX "scans_user_id_image_hash_idx" ON "scans"("user_id", "image_hash");

