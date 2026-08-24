"use strict";

function classifyPropagationAge(submittedAt, now = new Date(), thresholds = {}) {
  if (!submittedAt) return Object.freeze({ ageMs: null, state: "unknown" });
  const warnAfterMs = Number(thresholds.warnAfterMs ?? 6 * 60 * 60 * 1000);
  const staleAfterMs = Number(thresholds.staleAfterMs ?? 24 * 60 * 60 * 1000);
  const ageMs = Math.max(0, new Date(now).getTime() - new Date(submittedAt).getTime());
  const state = ageMs >= staleAfterMs ? "stale" : ageMs >= warnAfterMs ? "slow" : "normal";
  return Object.freeze({ ageMs, state, warnAfterMs, staleAfterMs });
}

async function listPendingPropagation(prisma, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const providerKey = options.providerKey || "google_business_profile";
  const rows = await prisma.$queryRaw`
    SELECT dl."id" AS "listingId", dl."agencyId", a."name" AS "agencyName", a."city",
           dl."status", dl."automationStatus", dl."submittedAt", dl."listingUrl"
    FROM "DirectoryListing" dl
    JOIN "Agency" a ON a."id" = dl."agencyId"
    JOIN "LocalDirectory" d ON d."id" = dl."directoryId"
    WHERE dl."automationStatus" IN ('submitted', 'verification_pending')
      AND (${providerKey}::TEXT = 'google_business_profile' AND d."name" = 'Google Business Profile')
    ORDER BY dl."submittedAt" ASC NULLS FIRST, dl."agencyId" ASC
    LIMIT ${limit}
  `;
  const now = options.now || new Date();
  return rows.map((row) => ({ ...row, propagation: classifyPropagationAge(row.submittedAt, now, options) }));
}

module.exports = { classifyPropagationAge, listPendingPropagation };
