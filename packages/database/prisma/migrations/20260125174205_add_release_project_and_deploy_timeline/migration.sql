-- Add deployment correlation timeline event
ALTER TYPE "IncidentTimelineEventType" ADD VALUE IF NOT EXISTS 'DEPLOYMENT_CORRELATED';

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "project" TEXT NOT NULL DEFAULT 'default',
    "commitSha" TEXT,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Release_workspaceId_idx" ON "Release"("workspaceId");
CREATE INDEX "Release_workspaceId_deployedAt_idx" ON "Release"("workspaceId", "deployedAt");
CREATE UNIQUE INDEX "Release_workspaceId_version_environment_project_key" ON "Release"("workspaceId", "version", "environment", "project");

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable AlertGroup
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "releaseId" TEXT;

-- AddForeignKey
ALTER TABLE "AlertGroup" ADD CONSTRAINT "AlertGroup_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "AlertGroup_releaseId_idx" ON "AlertGroup"("releaseId");
