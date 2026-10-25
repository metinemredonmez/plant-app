-- CreateEnum
CREATE TYPE "PlantSpot" AS ENUM ('INDOOR', 'BALCONY', 'GARDEN');

-- CreateEnum
CREATE TYPE "CareKind" AS ENUM ('WATER', 'FERTILIZE', 'REPOT', 'PRUNE', 'MIST', 'NOTE');

-- CreateEnum
CREATE TYPE "ScanKind" AS ENUM ('IDENTIFY', 'DIAGNOSE');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'GRACE', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "public_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "plant_species" (
    "id" SERIAL NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "turkish_name" TEXT NOT NULL,
    "other_names" TEXT[],
    "family" TEXT,
    "light" "LightLevel" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "water_summer_days" INTEGER NOT NULL,
    "water_winter_days" INTEGER NOT NULL,
    "humidity" TEXT NOT NULL,
    "temp_min_c" INTEGER NOT NULL,
    "temp_max_c" INTEGER NOT NULL,
    "toxic_to_pets" BOOLEAN,
    "toxicity_note" TEXT,
    "summary" TEXT NOT NULL,
    "watering_tip" TEXT NOT NULL,
    "light_tip" TEXT NOT NULL,
    "fertilizing_tip" TEXT NOT NULL,
    "common_problems" TEXT[],
    "spots" "PlantSpot"[],
    "source" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plants" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "species_id" INTEGER,
    "scientific_name" TEXT,
    "nickname" TEXT NOT NULL,
    "spot" "PlantSpot" NOT NULL DEFAULT 'INDOOR',
    "photo_key" TEXT,
    "watering_interval_days" INTEGER NOT NULL,
    "last_watered_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_events" (
    "id" SERIAL NOT NULL,
    "user_plant_id" INTEGER NOT NULL,
    "kind" "CareKind" NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_plant_id" INTEGER,
    "kind" "ScanKind" NOT NULL,
    "status" "ScanStatus" NOT NULL,
    "image_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_plant_id" INTEGER,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "EntitlementStatus" NOT NULL,
    "product_id" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "will_renew" BOOLEAN NOT NULL DEFAULT true,
    "last_event_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "app_user_id" TEXT,
    "outcome" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plant_species_scientific_name_key" ON "plant_species"("scientific_name");

-- CreateIndex
CREATE INDEX "user_plants_user_id_idx" ON "user_plants"("user_id");

-- CreateIndex
CREATE INDEX "care_events_user_plant_id_at_idx" ON "care_events"("user_plant_id", "at");

-- CreateIndex
CREATE INDEX "scans_user_id_created_at_idx" ON "scans"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_user_plant_id_created_at_idx" ON "chat_messages"("user_id", "user_plant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_user_id_key" ON "entitlements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_event_id_key" ON "billing_events"("provider", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- AddForeignKey
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "plant_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_events" ADD CONSTRAINT "care_events_user_plant_id_fkey" FOREIGN KEY ("user_plant_id") REFERENCES "user_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_plant_id_fkey" FOREIGN KEY ("user_plant_id") REFERENCES "user_plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_plant_id_fkey" FOREIGN KEY ("user_plant_id") REFERENCES "user_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

