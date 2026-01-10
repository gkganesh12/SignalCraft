ALTER TABLE "AlertEvent" ADD COLUMN "alertGroupId" TEXT;

CREATE INDEX "AlertEvent_alertGroupId_idx" ON "AlertEvent"("alertGroupId");

ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
