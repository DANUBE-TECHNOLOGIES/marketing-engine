"use strict";

function finiteCoordinate(value, min, max) {
  if (value == null || value === "") return null;

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    return null;
  }

  return number;
}

function coordinatesFromGoogleLocationData(value) {
  const data =
    value && typeof value === "object"
      ? value
      : {};

  const candidates = [
    data.latlng,
    data.latLng,
    data.coordinates,
    data.location,
    data.geometry?.location,
    data.metadata?.latlng,
    data.metadata?.latLng,
    data,
  ].filter(
    candidate =>
      candidate &&
      typeof candidate === "object"
  );

  for (const candidate of candidates) {
    const latitude = finiteCoordinate(
      candidate.latitude ?? candidate.lat,
      -90,
      90
    );

    const longitude = finiteCoordinate(
      candidate.longitude ??
        candidate.lng ??
        candidate.lon,
      -180,
      180
    );

    if (
      latitude != null &&
      longitude != null
    ) {
      return {
        latitude,
        longitude
      };
    }
  }

  return null;
}

function latestCampaignCoordinates(agency) {
  const campaigns =
    Array.isArray(agency?.rankingGridCampaigns)
      ? agency.rankingGridCampaigns
      : [];

  /*
   * Only a completed ranking-grid campaign may become
   * the canonical GEO reference.
   *
   * The campaigns are expected to be supplied newest first.
   * Pending/running/failed campaigns are ignored.
   */
  for (const campaign of campaigns) {
    if (campaign?.status !== "completed") {
      continue;
    }

    const latitude = finiteCoordinate(
      campaign.centerLat,
      -90,
      90
    );

    const longitude = finiteCoordinate(
      campaign.centerLng,
      -180,
      180
    );

    if (
      latitude == null ||
      longitude == null
    ) {
      continue;
    }

    return {
      latitude,
      longitude,
      source: "ranking_grid_campaign",
      campaignId: Number(campaign.id)
    };
  }

  return null;
}

function resolveRankingTargetGeo(agency) {
  if (!agency) {
    return {
      ready: false,
      reason: "AGENCY_REQUIRED",
      coordinates: null
    };
  }

  const campaignCoordinates =
    latestCampaignCoordinates(agency);

  if (campaignCoordinates) {
    return {
      ready: true,
      reason: null,
      coordinates: campaignCoordinates
    };
  }

  const profileCoordinates =
    coordinatesFromGoogleLocationData(
      agency?.profile?.googleLocationData
    );

  if (profileCoordinates) {
    return {
      ready: true,
      reason: null,
      coordinates: {
        ...profileCoordinates,
        source: "google_location_data",
        campaignId: null
      }
    };
  }

  return {
    ready: false,
    reason: "RANKING_TARGET_COORDINATES_REQUIRED",
    coordinates: null
  };
}

function dataForSeoLocationCoordinate(
  coordinates,
  zoom = 10
) {
  const latitude = finiteCoordinate(
    coordinates?.latitude,
    -90,
    90
  );

  const longitude = finiteCoordinate(
    coordinates?.longitude,
    -180,
    180
  );

  const numericZoom = Number(zoom);

  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(numericZoom)
  ) {
    throw new Error(
      "RANKING_TARGET_COORDINATES_REQUIRED"
    );
  }

  return (
    `${latitude.toFixed(7)},` +
    `${longitude.toFixed(7)},` +
    `${numericZoom}z`
  );
}

module.exports = {
  finiteCoordinate,
  coordinatesFromGoogleLocationData,
  latestCampaignCoordinates,
  resolveRankingTargetGeo,
  dataForSeoLocationCoordinate
};
