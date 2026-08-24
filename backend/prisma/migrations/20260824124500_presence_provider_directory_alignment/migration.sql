-- Presence provider / LocalDirectory alignment
-- Additive only: preserve existing directory rows and user-maintained metadata.

INSERT INTO "LocalDirectory"
  ("name", "website", "url", "category", "impactScore", "difficulty", "priority", "active", "submissionUrl", "submissionMode", "createdAt")
VALUES
  ('HERE', 'https://www.here.com/', 'https://www.here.com/', 'map', 7, 3, 70, TRUE, 'https://mapcreator.here.com/', 'submission_api', NOW()),
  ('Tripadvisor', 'https://www.tripadvisor.fr/', 'https://www.tripadvisor.fr/', 'directory', 7, 2, 75, TRUE, 'https://www.tripadvisor.fr/Owners', 'manual', NOW()),
  ('Petit Futé', 'https://www.petitfute.com/', 'https://www.petitfute.com/', 'directory', 5, 3, 60, TRUE, 'https://www.petitfute.com/', 'manual', NOW())
ON CONFLICT ("name") DO NOTHING;

-- Ensure every agency gains a placeholder listing for the newly supported directories.
INSERT INTO "DirectoryListing"
  ("agencyId", "directoryId", "status", "nameCorrect", "addressCorrect", "phoneCorrect", "websiteCorrect", "hoursCorrect", "categoryCorrect", "createdAt", "updatedAt")
SELECT a."id", d."id", 'missing', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, NOW(), NOW()
FROM "Agency" a
JOIN "LocalDirectory" d ON d."name" IN ('HERE', 'Tripadvisor', 'Petit Futé')
ON CONFLICT ("agencyId", "directoryId") DO NOTHING;
