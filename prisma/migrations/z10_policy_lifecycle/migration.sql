-- AlterTable
ALTER TABLE "SystemDocument" ADD COLUMN     "controls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nextReviewDue" TIMESTAMP(3),
ADD COLUMN     "reviewFrequencyMonths" INTEGER;

