-- CreateEnum
CREATE TYPE "SoftwareType" AS ENUM ('OPERATING_SYSTEM', 'APPLICATION', 'DATABASE', 'MIDDLEWARE', 'DRIVER', 'FIRMWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "Protocol" AS ENUM ('TCP', 'UDP', 'ICMP', 'OTHER');

-- CreateEnum
CREATE TYPE "FlowDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "PpsmStatus" AS ENUM ('APPROVED', 'PENDING', 'DENIED');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "location" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "virtual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SoftwareComponent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "vendor" TEXT,
    "type" "SoftwareType" NOT NULL DEFAULT 'APPLICATION',
    "eol" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftwareComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PpsmEntry" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "port" TEXT NOT NULL,
    "protocol" "Protocol" NOT NULL DEFAULT 'TCP',
    "service" TEXT NOT NULL,
    "direction" "FlowDirection" NOT NULL DEFAULT 'INBOUND',
    "boundary" TEXT,
    "dataDescription" TEXT,
    "classification" TEXT,
    "status" "PpsmStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PpsmEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoftwareComponent_assetId_idx" ON "SoftwareComponent"("assetId");

-- CreateIndex
CREATE INDEX "PpsmEntry_systemId_idx" ON "PpsmEntry"("systemId");

-- AddForeignKey
ALTER TABLE "SoftwareComponent" ADD CONSTRAINT "SoftwareComponent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PpsmEntry" ADD CONSTRAINT "PpsmEntry_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

