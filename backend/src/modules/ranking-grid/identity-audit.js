"use strict";

function nonEmpty(value) {
  const text = value == null ? "" : String(value).trim();
  return text || null;
}

function auditAgencyIdentity(agency, helpers = {}) {
  const profileIdentity = typeof helpers.profileIdentity === "function"
    ? helpers.profileIdentity(agency?.profile)
    : { placeId: null, cid: null };
  const reviewPlaceId = typeof helpers.placeIdFromGoogleReviewUrl === "function"
    ? helpers.placeIdFromGoogleReviewUrl(agency?.googleReviewUrl)
    : null;

  const profilePlaceId = nonEmpty(profileIdentity?.placeId);
  const cid = nonEmpty(profileIdentity?.cid);
  const reviewUrlPlaceId = nonEmpty(reviewPlaceId);
  const resolvedPlaceId = profilePlaceId || reviewUrlPlaceId || null;
  const googleLocationId = nonEmpty(agency?.googleLocationId);

  let status = "missing";
  let source = null;

  if (profilePlaceId) {
    status = "ready";
    source = "profile_place_id";
  } else if (reviewUrlPlaceId) {
    status = "ready";
    source = "review_url_place_id";
  } else if (cid) {
    status = "ready";
    source = "profile_cid";
  } else if (googleLocationId) {
    status = "fallback";
    source = "google_location_id";
  }

  return {
    agencyId: Number(agency?.id),
    agencyName: agency?.name || null,
    city: agency?.city || null,
    status,
    source,
    resolvedPlaceId,
    cid,
    googleLocationId,
    hasGoogleReviewUrl: Boolean(nonEmpty(agency?.googleReviewUrl)),
    hasProfileLocationData: Boolean(
      agency?.profile?.googleLocationData &&
      typeof agency.profile.googleLocationData === "object" &&
      Object.keys(agency.profile.googleLocationData).length
    ),
    providerMatchMode: resolvedPlaceId
      ? "exact_place_id"
      : cid
        ? "exact_cid"
        : "textual_fallback",
  };
}

function summarizeIdentityAudit(rows) {
  const agencies = Array.isArray(rows) ? rows : [];
  const summary = {
    total: agencies.length,
    ready: 0,
    fallback: 0,
    missing: 0,
  };

  for (const row of agencies) {
    if (row?.status === "ready") summary.ready += 1;
    else if (row?.status === "fallback") summary.fallback += 1;
    else summary.missing += 1;
  }

  return summary;
}

module.exports = {
  auditAgencyIdentity,
  summarizeIdentityAudit,
};
