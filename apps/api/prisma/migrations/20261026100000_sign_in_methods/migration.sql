-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'APPLE', 'GOOGLE', 'PHONE');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'PHONE_LOGIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "care_profile" JSONB,
ADD COLUMN     "care_profile_at" TIMESTAMP(3),
ADD COLUMN     "last_sign_in_method" "AuthProvider",
ADD COLUMN     "paywall_offered_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "hint" TEXT,
    "apple_refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apple_revocations" (
    "id" SERIAL NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apple_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_subject_key" ON "auth_identities"("provider", "subject");

-- CreateIndex
CREATE INDEX "apple_revocations_next_attempt_at_idx" ON "apple_revocations"("next_attempt_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Accounts that exist already have been past onboarding: no paywall for them.
UPDATE "users" SET "paywall_offered_at" = "created_at" WHERE "paywall_offered_at" IS NULL;
