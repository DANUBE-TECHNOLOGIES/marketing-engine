"use strict";

function cleanAgencyIds(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(",");

  return [...new Set(
    source
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
  )].slice(0, 100);
}

function normalizeEditorialTargeting(value = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const scope = String(input.scope || "network").trim().toLowerCase();
  const agencyIds = cleanAgencyIds(input.agencyIds);

  if (scope === "agencies") {
    if (!agencyIds.length) {
      const error = new Error("Sélectionnez au moins une agence pour un contenu local.");
      error.statusCode = 400;
      error.code = "AI_CONTENT_TARGET_AGENCY_REQUIRED";
      throw error;
    }

    return {
      scope: "agencies",
      agencyIds,
    };
  }

  return {
    scope: "network",
    agencyIds: [],
  };
}

function targetingFromContent(content) {
  const seo = content?.seo && typeof content.seo === "object" && !Array.isArray(content.seo)
    ? content.seo
    : {};
  const targeting = seo.editorialTargeting;

  if (!targeting || typeof targeting !== "object" || Array.isArray(targeting)) {
    return {
      scope: "network",
      agencyIds: [],
      legacy: true,
    };
  }

  try {
    return {
      ...normalizeEditorialTargeting(targeting),
      legacy: false,
    };
  } catch {
    return {
      scope: "network",
      agencyIds: [],
      legacy: true,
    };
  }
}

function contentTargetsAgency(content, agencyId) {
  const targeting = targetingFromContent(content);
  if (targeting.scope === "network") return true;

  const id = String(agencyId || "").trim();
  return Boolean(id) && targeting.agencyIds.includes(id);
}

module.exports = {
  cleanAgencyIds,
  normalizeEditorialTargeting,
  targetingFromContent,
  contentTargetsAgency,
};
