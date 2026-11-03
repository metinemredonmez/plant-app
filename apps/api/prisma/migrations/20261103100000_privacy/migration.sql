-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECT', 'DELETE', 'OBJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'DONE', 'REJECTED');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'PRIVACY_REQUEST';

-- AlterTable
ALTER TABLE "scans" ALTER COLUMN "image_key" DROP NOT NULL;

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "sections" JSONB NOT NULL,
    "draft" BOOLEAN NOT NULL DEFAULT true,
    "published_by_id" INTEGER,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_requests" (
    "id" SERIAL NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "name" TEXT,
    "email" TEXT,
    "contact_hint" TEXT NOT NULL,
    "message" TEXT,
    "user_id" INTEGER,
    "due_at" TIMESTAMP(3) NOT NULL,
    "reminder_sent_at" TIMESTAMP(3),
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "responded_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_deletions" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "next_attempt_at" TIMESTAMP(3) NOT NULL,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "name" TEXT NOT NULL,
    "last_run_at" TIMESTAMP(3) NOT NULL,
    "result" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "legal_documents_slug_published_at_idx" ON "legal_documents"("slug", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_version_key" ON "legal_documents"("slug", "version");

-- CreateIndex
CREATE INDEX "privacy_requests_status_due_at_idx" ON "privacy_requests"("status", "due_at");

-- CreateIndex
CREATE INDEX "provider_deletions_next_attempt_at_idx" ON "provider_deletions"("next_attempt_at");

