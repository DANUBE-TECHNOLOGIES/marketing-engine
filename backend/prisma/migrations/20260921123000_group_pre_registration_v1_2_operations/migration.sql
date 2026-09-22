ALTER TABLE "GroupPreRegistration"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NEW',
  ADD COLUMN "assignedTo" TEXT,
  ADD COLUMN "nextActionAt" TIMESTAMP(3),
  ADD COLUMN "allocatedDeparture" TEXT,
  ADD COLUMN "allocatedOrigin" TEXT,
  ADD COLUMN "lastNote" TEXT,
  ADD COLUMN "lastNoteAt" TIMESTAMP(3);

CREATE TABLE "GroupPreRegistrationNote" (
  "id" TEXT NOT NULL,
  "preRegistrationId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "author" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GroupPreRegistrationNote_pkey"
    PRIMARY KEY ("id")
);

ALTER TABLE "GroupPreRegistrationNote"
  ADD CONSTRAINT "GroupPreRegistrationNote_preRegistrationId_fkey"
  FOREIGN KEY ("preRegistrationId")
  REFERENCES "GroupPreRegistration"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "GroupPreRegistration_campaignSlug_status_idx"
  ON "GroupPreRegistration"("campaignSlug", "status");

CREATE INDEX "GroupPreRegistration_campaignSlug_assignedTo_idx"
  ON "GroupPreRegistration"("campaignSlug", "assignedTo");

CREATE INDEX "GroupPreRegistration_campaignSlug_nextActionAt_idx"
  ON "GroupPreRegistration"("campaignSlug", "nextActionAt");

CREATE INDEX "GroupPreRegistration_campaignSlug_allocatedDeparture_allocatedOrigin_idx"
  ON "GroupPreRegistration"(
    "campaignSlug",
    "allocatedDeparture",
    "allocatedOrigin"
  );

CREATE INDEX "GroupPreRegistrationNote_preRegistrationId_createdAt_idx"
  ON "GroupPreRegistrationNote"(
    "preRegistrationId",
    "createdAt"
  );
