-- AlterTable: Add project field to AlertGroup for Phase 5 filtering
ALTER TABLE "AlertGroup" ADD COLUMN "project" TEXT NOT NULL DEFAULT 'default';

-- Update existing rows to get project from first related AlertEvent
UPDATE "AlertGroup" ag
SET project = COALESCE(
  (SELECT project FROM "AlertEvent" ae WHERE ae."alertGroupId" = ag.id LIMIT 1),
  'default'
);
