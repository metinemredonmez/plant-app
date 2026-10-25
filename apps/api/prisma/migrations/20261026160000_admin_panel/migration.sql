-- CreateEnum
CREATE TYPE "SpeciesStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AiTask" AS ENUM ('IDENTIFY', 'DIAGNOSE', 'ASSISTANT', 'CARD_DRAFT');

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "report_resolution" TEXT,
ADD COLUMN     "report_resolved_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "plant_species" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" INTEGER,
ADD COLUMN     "status" "SpeciesStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" SERIAL NOT NULL,
    "task" "AiTask" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spend_alerts" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "total_usd" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spend_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "spend_alerts_day_key" ON "spend_alerts"("day");

