"use strict";

function finiteCoordinate(value, min, max) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function coordinatesFromGoogleLocationData(value) {
  const data = value && typeof value === "object" ? value : {};
  const candidates = [
    data.latlng,
    data.latLng,
    data.coordinates,
    data.location,
    data.geometry?.location,
    data.metadata?.latlng,
    data.metadata?.latLng,
    data,
  ].filter((candidate) => candidate && typeof candidate === "object");

  for (const candidate of candidates) {
    const latitude = finiteCoordinate(
      candidate.latitude ?? candidate.lat,
      -90,
      90,
    );
    const longitude = finiteCoordinate(
      candidate.longitude ?? candidate.lng ?? candidate.lon,
      -180,
      180,
    );
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }
  }
  return null;
}

function latestCampaignCoordinates(agency) {
  const campaign = Array.isArray(agency?.rankingGridCampaigns)
    ? agency.rankingGridCampaigns[0]
    : null;
  if (!campaign) return null;
  const latitude = finiteCoordinate(campaign.centerLat, -90, 90);
  const longitude = finiteCoordinate(campaign.centerLng, -180, 180);
  if (latitude == null || longitude == null) return null;
  return {
    latitude,
    longitude,
    campaignId: Number(campaign.id),
  };
}

function auditAgencyRollout(agency, identity) {
  const campaignCoordinates = latestCampaignCoordinates(agency);
  const profileCoordinates = coordinatesFromGoogleLocationData(
    agency?.profile?.googleLocationData,
  );
  const coordinates = campaignCoordinates || profileCoordinates;
  const coordinateSource = campaignCoordinates
    ? "ranking_grid_campaign"
    : profileCoordinates
      ? "google_location_data"
      : null;

  const activeKeywords = (Array.isArray(agency?.keywords) ? agency.keywords : [])
    .filter((keyword) => keyword?.active !== false)
    .map((keyword) => ({
      id: Number(keyword.id),
      keyword: keyword.keyword,
      city: keyword.city,
    }));

  const identityReady = identity?.status === "ready";
  const coordinatesReady = Boolean(coordinates);
  const keywordReady = activeKeywords.length > 0;
  const ready = identityReady && coordinatesReady && keywordReady;

  const blockers = [];
  if (!identityReady) blockers.push("identity");
  if (!coordinatesReady) blockers.push("coordinates");
  if (!keywordReady) blockers.push("keyword");

  return {
    agencyId: Number(agency?.id),
    agencyName: agency?.name || null,
    city: agency?.city || null,
    status: ready ? "ready" : "blocked",
    blockers,
    identity: {
      status: identity?.status || "missing",
      source: identity?.source || null,
      providerMatchMode: identity?.providerMatchMode || "textual_fallback",
      placeId: identity?.resolvedPlaceId || null,
      cid: identity?.cid || null,
    },
    center: coordinates
      ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          source: coordinateSource,
          campaignId: campaignCoordinates?.campaignId || null,
        }
      : null,
    activeKeywords,
  };
}

function summarizeRolloutReadiness(rows) {
  const agencies = Array.isArray(rows) ? rows : [];
  const summary = {
    total: agencies.length,
    ready: 0,
    blocked: 0,
    missingIdentity: 0,
    missingCoordinates: 0,
    missingKeyword: 0,
  };

  for (const row of agencies) {
    if (row?.status === "ready") summary.ready += 1;
    else summary.blocked += 1;
    if (row?.blockers?.includes("identity")) summary.missingIdentity += 1;
    if (row?.blockers?.includes("coordinates")) summary.missingCoordinates += 1;
    if (row?.blockers?.includes("keyword")) summary.missingKeyword += 1;
  }
  return summary;
}

module.exports = {
  finiteCoordinate,
  coordinatesFromGoogleLocationData,
  auditAgencyRollout,
  summarizeRolloutReadiness,
};
