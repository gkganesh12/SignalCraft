-- CreateTable
CREATE TABLE "ExternalMapping" (
    "id" TEXT NOT NULL,
    "alertGroupId" TEXT NOT NULL,
    "integrationType" "IntegrationType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalMapping_externalId_idx" ON "ExternalMapping"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMapping_alertGroupId_integrationType_key" ON "ExternalMapping"("alertGroupId", "integrationType");

-- AddForeignKey
ALTER TABLE "ExternalMapping" ADD CONSTRAINT "ExternalMapping_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
