CREATE TABLE "AcquisitionFunnelEvent" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "siteSlug" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "funnelId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "questionNumber" INTEGER NOT NULL DEFAULT 0,
  "question" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmContent" TEXT,
  "referrer" TEXT,
  "path" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcquisitionFunnelEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcquisitionFunnelEvent_session_event_question_key" ON "AcquisitionFunnelEvent"("sessionId", "event", "questionNumber");
CREATE INDEX "AcquisitionFunnelEvent_createdAt_idx" ON "AcquisitionFunnelEvent"("createdAt");
CREATE INDEX "AcquisitionFunnelEvent_siteSlug_createdAt_idx" ON "AcquisitionFunnelEvent"("siteSlug", "createdAt");
CREATE INDEX "AcquisitionFunnelEvent_funnelId_createdAt_idx" ON "AcquisitionFunnelEvent"("funnelId", "createdAt");
