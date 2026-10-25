-- AlterTable
ALTER TABLE "plant_species" ADD COLUMN     "gbif_id" TEXT,
ADD COLUMN     "powo_id" TEXT,
ADD COLUMN     "wikidata_id" TEXT;

-- CreateTable
CREATE TABLE "plant_names" (
    "id" SERIAL NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "turkish_name" TEXT NOT NULL,
    "other_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wikidata_id" TEXT NOT NULL,
    "gbif_id" TEXT,
    "powo_id" TEXT,

    CONSTRAINT "plant_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plant_names_name_key_key" ON "plant_names"("name_key");

