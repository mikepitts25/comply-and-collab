-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('ISA', 'MOU', 'MOA', 'SLA', 'OTHER');

-- CreateEnum
CREATE TYPE "InterconnectionStatus" AS ENUM ('PLANNED', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateTable
CREATE TABLE "Interconnection" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "remoteName" TEXT NOT NULL,
    "remoteOwner" TEXT,
    "connectionType" TEXT NOT NULL,
    "direction" "FlowDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "dataDescription" TEXT,
    "classification" TEXT,
    "agreementType" "AgreementType" NOT NULL DEFAULT 'ISA',
    "status" "InterconnectionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "agreementDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interconnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "systemControlId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "filename" TEXT,
    "contentType" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "sha256" TEXT,
    "data" BYTEA,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interconnection_systemId_idx" ON "Interconnection"("systemId");

-- CreateIndex
CREATE INDEX "Interconnection_expiresAt_idx" ON "Interconnection"("expiresAt");

-- CreateIndex
CREATE INDEX "Evidence_systemControlId_idx" ON "Evidence"("systemControlId");

-- AddForeignKey
ALTER TABLE "Interconnection" ADD CONSTRAINT "Interconnection_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_systemControlId_fkey" FOREIGN KEY ("systemControlId") REFERENCES "SystemControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

