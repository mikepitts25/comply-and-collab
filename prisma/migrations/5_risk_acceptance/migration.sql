-- CreateTable
CREATE TABLE "RiskAcceptance" (
    "id" TEXT NOT NULL,
    "poamId" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "authorizingOfficial" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "residualRisk" "ImpactLevel" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewBy" TIMESTAMP(3),

    CONSTRAINT "RiskAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskAcceptance_poamId_key" ON "RiskAcceptance"("poamId");

-- CreateIndex
CREATE INDEX "RiskAcceptance_reviewBy_idx" ON "RiskAcceptance"("reviewBy");

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_poamId_fkey" FOREIGN KEY ("poamId") REFERENCES "Poam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

