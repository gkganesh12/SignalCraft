-- Add incident timeline event type and entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentTimelineEventType') THEN
    CREATE TYPE "IncidentTimelineEventType" AS ENUM (
      'ALERT_CREATED',
      'ALERT_ACKED',
      'ALERT_SNOOZED',
      'ALERT_RESOLVED',
      'WAR_ROOM_CREATED',
      'CONFERENCE_LINK_SET',
      'JIRA_TICKET_CREATED',
      'ROUTING_NOTIFICATION'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "IncidentTimelineEntry" (
  "id" TEXT PRIMARY KEY,
  "alertGroupId" TEXT NOT NULL,
  "type" "IncidentTimelineEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "source" TEXT,
  "metadataJson" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IncidentTimelineEntry_alertGroupId_idx" ON "IncidentTimelineEntry" ("alertGroupId");
CREATE INDEX IF NOT EXISTS "IncidentTimelineEntry_alertGroupId_occurredAt_idx" ON "IncidentTimelineEntry" ("alertGroupId", "occurredAt");

ALTER TABLE "IncidentTimelineEntry" ADD CONSTRAINT "IncidentTimelineEntry_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
