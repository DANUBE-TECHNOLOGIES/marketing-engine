"use strict";

const getGoogleAccessToken = require("../../lib/googleAccessToken");
const {
  normalizeRegularHours,
  normalizeSpecialHours,
  statusForHours,
  weeklySchedule,
} = require("./hours");

class AgencyProfileService {
  constructor(prisma, repository) {
    this.prisma = prisma;
    this.repository = repository;
  }

  async syncGoogleHours(agencyId) {
    const normalizedAgencyId = Number(agencyId);

    if (!Number.isInteger(normalizedAgencyId)) {
      const error = new Error("Identifiant d’agence invalide.");
      error.statusCode = 400;
      error.code = "INVALID_AGENCY_ID";
      throw error;
    }

    const agency = await this.repository.findAgency(normalizedAgencyId);

    if (!agency) {
      const error = new Error("Agence introuvable.");
      error.statusCode = 404;
      error.code = "AGENCY_NOT_FOUND";
      throw error;
    }

    if (!agency.googleLocationId) {
      const error = new Error("Agence non reliée à Google Business Profile.");
      error.statusCode = 409;
      error.code = "GOOGLE_LOCATION_NOT_LINKED";
      throw error;
    }

    const accessToken = await getGoogleAccessToken(this.prisma);
    const locationName = String(agency.googleLocationId).replace(/^\/+/, "");

    const fields = [
      "name",
      "title",
      "regularHours",
      "specialHours",
      "storefrontAddress",
      "phoneNumbers",
      "websiteUri",
      "latlng",
    ].join(",");

    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        body?.error?.message || "Échec de la synchronisation Google Business."
      );
      error.statusCode = response.status;
      error.code = "GOOGLE_BUSINESS_SYNC_FAILED";
      throw error;
    }

    return this.repository.upsert(agency.id, {
      regularHours: normalizeRegularHours(body.regularHours),
      specialHours: normalizeSpecialHours(body.specialHours),
      googleLocationData: body,
      hoursSource: "google-business-profile",
      googleSyncedAt: new Date(),
    });
  }

  async publicHours(siteSlug, tenantSlug) {
    const site = await this.repository.findBySiteSlug(siteSlug, tenantSlug);

    if (!site?.agency) {
      const error = new Error("Mini-site agence introuvable.");
      error.statusCode = 404;
      error.code = "PUBLIC_AGENCY_SITE_NOT_FOUND";
      throw error;
    }

    const profile = site.agency.profile || {};
    const regularHours = Array.isArray(profile.regularHours)
      ? profile.regularHours
      : [];
    const specialHours = Array.isArray(profile.specialHours)
      ? profile.specialHours
      : [];
    const timezone = profile.timezone || "Europe/Paris";

    return {
      agencyId: site.agency.id,
      timezone,
      source: profile.hoursSource || "unavailable",
      syncedAt: profile.googleSyncedAt || null,
      status: statusForHours(regularHours, specialHours, timezone),
      weekly: weeklySchedule(regularHours),
      specialHours,
    };
  }
}

module.exports = AgencyProfileService;
