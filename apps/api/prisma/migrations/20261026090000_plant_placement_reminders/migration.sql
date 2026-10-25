-- CreateEnum
CREATE TYPE "PotKind" AS ENUM ('PLASTIC', 'TERRACOTTA', 'GLAZED', 'SELF_WATERING');

-- AlterTable
ALTER TABLE "user_plants" ADD COLUMN     "light" "LightLevel",
ADD COLUMN     "pot" "PotKind",
ADD COLUMN     "watering_interval_custom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "reminder_minute" INTEGER NOT NULL DEFAULT 540;

