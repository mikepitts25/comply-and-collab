-- CreateEnum
CREATE TYPE "DeviationType" AS ENUM ('FALSE_POSITIVE', 'OPERATIONAL_REQUIREMENT');

-- CreateEnum
CREATE TYPE "DeviationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Deviation" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "type" "DeviationType" NOT NULL,
    "status" "DeviationStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT NOT NULL,
    "evidence" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "Deviation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deviation_findingId_idx" ON "Deviation"("findingId");

-- CreateIndex
CREATE INDEX "Deviation_status_idx" ON "Deviation"("status");

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

