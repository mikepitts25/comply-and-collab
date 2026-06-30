-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedByRescan" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PostureSnapshot" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanImportId" TEXT,
    "openCritical" INTEGER NOT NULL DEFAULT 0,
    "openHigh" INTEGER NOT NULL DEFAULT 0,
    "openMedium" INTEGER NOT NULL DEFAULT 0,
    "openLow" INTEGER NOT NULL DEFAULT 0,
    "totalOpen" INTEGER NOT NULL DEFAULT 0,
    "closedTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostureSnapshot_systemId_takenAt_idx" ON "PostureSnapshot"("systemId", "takenAt");

-- AddForeignKey
ALTER TABLE "PostureSnapshot" ADD CONSTRAINT "PostureSnapshot_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

