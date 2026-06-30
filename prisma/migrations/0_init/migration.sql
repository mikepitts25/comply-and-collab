-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ISSM', 'ISSO', 'ANALYST', 'ENGINEER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ATO', 'ATO_WITH_CONDITIONS', 'IATT', 'DENIED', 'EXPIRED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "Framework" AS ENUM ('RMF_800_53', 'STIG', 'CMMC', 'FEDRAMP');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SERVER', 'WORKSTATION', 'NETWORK_DEVICE', 'APPLIANCE', 'DATABASE', 'APPLICATION', 'CONTAINER', 'CLOUD_RESOURCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('NOT_IMPLEMENTED', 'PLANNED', 'IMPLEMENTED', 'PARTIALLY_IMPLEMENTED', 'INHERITED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('ACAS_NESSUS', 'STIG_CKL', 'STIG_CKLB', 'SCAP');

-- CreateEnum
CREATE TYPE "FindingSource" AS ENUM ('ACAS', 'STIG', 'SCAP', 'MANUAL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'NOT_A_FINDING', 'NOT_APPLICABLE', 'NOT_REVIEWED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PoamStatus" AS ENUM ('DRAFT', 'OPEN', 'ONGOING', 'RISK_ACCEPTED', 'COMPLETED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "description" TEXT,
    "confidentiality" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "integrity" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "availability" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "categorization" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "frameworks" "Framework"[] DEFAULT ARRAY['RMF_800_53', 'STIG']::"Framework"[],
    "authorizationStatus" "AuthorizationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "atoDate" TIMESTAMP(3),
    "atoExpiration" TIMESTAMP(3),
    "authorizingOfficial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "fqdn" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "type" "AssetType" NOT NULL DEFAULT 'SERVER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT,
    "baselineLow" BOOLEAN NOT NULL DEFAULT false,
    "baselineModerate" BOOLEAN NOT NULL DEFAULT false,
    "baselineHigh" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cci" (
    "id" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "controlId" TEXT,

    CONSTRAINT "Cci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemControl" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'NOT_IMPLEMENTED',
    "narrative" TEXT,
    "inheritedFrom" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanImport" (
    "id" TEXT NOT NULL,
    "type" "ScanType" NOT NULL,
    "filename" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalFindings" INTEGER NOT NULL DEFAULT 0,
    "openFindings" INTEGER NOT NULL DEFAULT 0,
    "newFindings" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScanImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "source" "FindingSource" NOT NULL,
    "systemId" TEXT NOT NULL,
    "assetId" TEXT,
    "scanImportId" TEXT,
    "ruleId" TEXT NOT NULL,
    "groupId" TEXT,
    "stigId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "checkText" TEXT,
    "fixText" TEXT,
    "comments" TEXT,
    "pluginId" TEXT,
    "cve" TEXT,
    "assigneeId" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "poamId" TEXT,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingControl" (
    "findingId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,

    CONSTRAINT "FindingControl_pkey" PRIMARY KEY ("findingId","controlId")
);

-- CreateTable
CREATE TABLE "Poam" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "weakness" TEXT NOT NULL,
    "sourceIdentifier" TEXT,
    "severity" "Severity" NOT NULL,
    "status" "PoamStatus" NOT NULL DEFAULT 'OPEN',
    "riskRating" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "residualRisk" "ImpactLevel",
    "recommendation" TEXT,
    "resourcesRequired" TEXT,
    "ownerId" TEXT,
    "detectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledCompletion" TIMESTAMP(3),
    "actualCompletion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "poamId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoamControl" (
    "poamId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,

    CONSTRAINT "PoamControl_pkey" PRIMARY KEY ("poamId","controlId")
);

-- CreateTable
CREATE TABLE "MitigationStatement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitigationStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MitigationControl" (
    "mitigationId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,

    CONSTRAINT "MitigationControl_pkey" PRIMARY KEY ("mitigationId","controlId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "findingId" TEXT,
    "poamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "verb" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FindingCci" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FindingCci_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PoamMitigation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PoamMitigation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "System_acronym_key" ON "System"("acronym");

-- CreateIndex
CREATE INDEX "Asset_systemId_idx" ON "Asset"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_systemId_hostname_key" ON "Asset"("systemId", "hostname");

-- CreateIndex
CREATE INDEX "Control_family_idx" ON "Control"("family");

-- CreateIndex
CREATE INDEX "Cci_controlId_idx" ON "Cci"("controlId");

-- CreateIndex
CREATE INDEX "SystemControl_systemId_idx" ON "SystemControl"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemControl_systemId_controlId_key" ON "SystemControl"("systemId", "controlId");

-- CreateIndex
CREATE INDEX "ScanImport_systemId_idx" ON "ScanImport"("systemId");

-- CreateIndex
CREATE INDEX "Finding_systemId_status_idx" ON "Finding"("systemId", "status");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_systemId_ruleId_assetId_key" ON "Finding"("systemId", "ruleId", "assetId");

-- CreateIndex
CREATE INDEX "FindingControl_controlId_idx" ON "FindingControl"("controlId");

-- CreateIndex
CREATE INDEX "Poam_systemId_status_idx" ON "Poam"("systemId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Poam_systemId_number_key" ON "Poam"("systemId", "number");

-- CreateIndex
CREATE INDEX "Milestone_poamId_idx" ON "Milestone"("poamId");

-- CreateIndex
CREATE INDEX "MitigationStatement_approved_idx" ON "MitigationStatement"("approved");

-- CreateIndex
CREATE INDEX "Comment_findingId_idx" ON "Comment"("findingId");

-- CreateIndex
CREATE INDEX "Comment_poamId_idx" ON "Comment"("poamId");

-- CreateIndex
CREATE INDEX "Activity_entity_entityId_idx" ON "Activity"("entity", "entityId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "_FindingCci_B_index" ON "_FindingCci"("B");

-- CreateIndex
CREATE INDEX "_PoamMitigation_B_index" ON "_PoamMitigation"("B");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cci" ADD CONSTRAINT "Cci_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemControl" ADD CONSTRAINT "SystemControl_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemControl" ADD CONSTRAINT "SystemControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanImport" ADD CONSTRAINT "ScanImport_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanImport" ADD CONSTRAINT "ScanImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanImportId_fkey" FOREIGN KEY ("scanImportId") REFERENCES "ScanImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_poamId_fkey" FOREIGN KEY ("poamId") REFERENCES "Poam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingControl" ADD CONSTRAINT "FindingControl_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingControl" ADD CONSTRAINT "FindingControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poam" ADD CONSTRAINT "Poam_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poam" ADD CONSTRAINT "Poam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_poamId_fkey" FOREIGN KEY ("poamId") REFERENCES "Poam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoamControl" ADD CONSTRAINT "PoamControl_poamId_fkey" FOREIGN KEY ("poamId") REFERENCES "Poam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoamControl" ADD CONSTRAINT "PoamControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MitigationStatement" ADD CONSTRAINT "MitigationStatement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MitigationControl" ADD CONSTRAINT "MitigationControl_mitigationId_fkey" FOREIGN KEY ("mitigationId") REFERENCES "MitigationStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MitigationControl" ADD CONSTRAINT "MitigationControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_poamId_fkey" FOREIGN KEY ("poamId") REFERENCES "Poam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FindingCci" ADD CONSTRAINT "_FindingCci_A_fkey" FOREIGN KEY ("A") REFERENCES "Cci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FindingCci" ADD CONSTRAINT "_FindingCci_B_fkey" FOREIGN KEY ("B") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PoamMitigation" ADD CONSTRAINT "_PoamMitigation_A_fkey" FOREIGN KEY ("A") REFERENCES "MitigationStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PoamMitigation" ADD CONSTRAINT "_PoamMitigation_B_fkey" FOREIGN KEY ("B") REFERENCES "Poam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

