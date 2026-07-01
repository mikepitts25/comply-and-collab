-- AlterTable
ALTER TABLE "User" ADD COLUMN     "edipi" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_edipi_key" ON "User"("edipi");

