-- Add anomaly model storage
CREATE TABLE IF NOT EXISTS "AnomalyModel" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "baseline" JSONB NOT NULL,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnomalyModel_workspaceId_metricKey_key" ON "AnomalyModel" ("workspaceId", "metricKey");
CREATE INDEX IF NOT EXISTS "AnomalyModel_workspaceId_idx" ON "AnomalyModel" ("workspaceId");

ALTER TABLE "AnomalyModel" ADD CONSTRAINT "AnomalyModel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
