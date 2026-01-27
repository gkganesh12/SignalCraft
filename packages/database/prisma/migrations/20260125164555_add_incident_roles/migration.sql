-- Add incident roles enum and assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentRole') THEN
    CREATE TYPE "IncidentRole" AS ENUM ('COMMANDER', 'SCRIBE', 'LIAISON', 'TECH_LEAD');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "IncidentRoleAssignment" (
  "id" TEXT PRIMARY KEY,
  "alertGroupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "IncidentRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "IncidentRoleAssignment_alertGroupId_role_key" ON "IncidentRoleAssignment" ("alertGroupId", "role");
CREATE INDEX IF NOT EXISTS "IncidentRoleAssignment_alertGroupId_idx" ON "IncidentRoleAssignment" ("alertGroupId");
CREATE INDEX IF NOT EXISTS "IncidentRoleAssignment_userId_idx" ON "IncidentRoleAssignment" ("userId");

ALTER TABLE "IncidentRoleAssignment" ADD CONSTRAINT "IncidentRoleAssignment_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentRoleAssignment" ADD CONSTRAINT "IncidentRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
