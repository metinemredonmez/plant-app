-- AlterTable
ALTER TABLE "plant_species" ADD COLUMN     "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[];

