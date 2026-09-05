"use strict";

const { Prisma } = require("@prisma/client");

const ROLLOUT_PREPARATION_ACK = "PREPARE-NETWORK-ROLLOUT";
const DEFAULT_RANKING_KEYWORD = "agence de voyage";

function agenciesMissingActiveKeyword(agencies) {
  return (Array.isArray(agencies) ? agencies : []).filter(
    (agency) => !Array.isArray(agency?.keywords) || agency.keywords.length === 0,
  );
}

function agenciesMissingCoordinates(agencies, auditAgency) {
  return (Array.isArray(agencies) ? agencies : []).filter((agency) => {
    const audited = auditAgency(agency);
    return Array.isArray(audited?.blockers) && audited.blockers.includes("coordinates");
  });
}

async function ensureMissingRankingKeywords(prisma, tenantId, agencies) {
  if (typeof prisma?.$queryRaw !== "function") {
    const error = new Error("Raw Prisma query capability is required to prepare ranking keywords");
    error.code = "RANKING_GRID_PREPARE_PRISMA_UNAVAILABLE";
    throw error;
  }

  const targets = agenciesMissingActiveKeyword(agencies);
  if (!targets.length) return [];

  const agencyIds = targets.map((agency) => Number(agency.id));
  return prisma.$queryRaw(Prisma.sql`
    INSERT INTO "RankingKeyword"
      ("agencyId", "keyword", "city", "active", "createdAt")
    SELECT
      a.id,
      ${DEFAULT_RANKING_KEYWORD},
      a."city",
      true,
      NOW()
    FROM "Agency" a
    WHERE a."tenantId" = ${tenantId}
      AND a.id IN (${Prisma.join(agencyIds)})
      AND NOT EXISTS (
        SELECT 1
        FROM "RankingKeyword" existing
        WHERE existing."agencyId" = a.id
          AND existing."active" = true
      )
    RETURNING id, "agencyId", "keyword", "city", "active"
  `);
}

async function syncMissingGoogleCoordinates({ agencies, auditAgency, syncGoogleProfile }) {
  const targets = agenciesMissingCoordinates(agencies, auditAgency);
  const results = [];

  for (const agency of targets) {
    if (!agency.googleLocationId) {
      results.push({
        agencyId: Number(agency.id),
        city: agency.city,
        status: "skipped",
        reason: "google_location_not_linked",
      });
      continue;
    }

    try {
      const profile = await syncGoogleProfile(Number(agency.id));
      const data = profile?.googleLocationData && typeof profile.googleLocationData === "object"
        ? profile.googleLocationData
        : {};
      results.push({
        agencyId: Number(agency.id),
        city: agency.city,
        status: "synced",
        hasLatLng: Boolean(data.latlng || data.latLng),
      });
    } catch (error) {
      results.push({
        agencyId: Number(agency.id),
        city: agency.city,
        status: "error",
        code: error?.code || null,
        message: error?.message || "Google Business Profile sync failed",
      });
    }
  }

  return results;
}

module.exports = {
  ROLLOUT_PREPARATION_ACK,
  DEFAULT_RANKING_KEYWORD,
  agenciesMissingActiveKeyword,
  agenciesMissingCoordinates,
  ensureMissingRankingKeywords,
  syncMissingGoogleCoordinates,
};
