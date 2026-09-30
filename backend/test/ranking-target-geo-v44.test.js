"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  finiteCoordinate,
  coordinatesFromGoogleLocationData,
  latestCampaignCoordinates,
  resolveRankingTargetGeo,
  dataForSeoLocationCoordinate
} = require("../src/lib/ranking-target-geo");

test("accepts finite valid coordinates", () => {
  assert.equal(
    finiteCoordinate("48.76235", -90, 90),
    48.76235
  );
});

test("rejects invalid coordinates", () => {
  assert.equal(
    finiteCoordinate("invalid", -90, 90),
    null
  );

  assert.equal(
    finiteCoordinate(181, -180, 180),
    null
  );
});

test("extracts coordinates from Google location data", () => {
  const result =
    coordinatesFromGoogleLocationData({
      geometry: {
        location: {
          lat: 48.762367,
          lng: 2.6688323
        }
      }
    });

  assert.deepEqual(result, {
    latitude: 48.762367,
    longitude: 2.6688323
  });
});

test("latest ranking grid campaign has priority", () => {
  const result =
    resolveRankingTargetGeo({
      rankingGridCampaigns: [
        {
        status: "completed",
          id: 18,
          centerLat: 48.76235,
          centerLng: 2.668852
        }
      ],
      profile: {
        googleLocationData: {
          latitude: 1,
          longitude: 2
        }
      }
    });

  assert.equal(result.ready, true);

  assert.equal(
    result.coordinates.source,
    "ranking_grid_campaign"
  );

  assert.equal(
    result.coordinates.latitude,
    48.76235
  );

  assert.equal(
    result.coordinates.longitude,
    2.668852
  );

  assert.equal(
    result.coordinates.campaignId,
    18
  );
});

test("Google location data is fallback", () => {
  const result =
    resolveRankingTargetGeo({
      rankingGridCampaigns: [],
      profile: {
        googleLocationData: {
          latlng: {
            latitude: 48.762367,
            longitude: 2.6688323
          }
        }
      }
    });

  assert.equal(result.ready, true);

  assert.equal(
    result.coordinates.source,
    "google_location_data"
  );
});

test("missing coordinates fail closed", () => {
  const result =
    resolveRankingTargetGeo({
      rankingGridCampaigns: [],
      profile: null
    });

  assert.equal(result.ready, false);

  assert.equal(
    result.reason,
    "RANKING_TARGET_COORDINATES_REQUIRED"
  );
});

test("builds deterministic DataForSEO coordinate", () => {
  assert.equal(
    dataForSeoLocationCoordinate({
      latitude: 48.76235,
      longitude: 2.668852
    }),
    "48.7623500,2.6688520,10z"
  );
});

test("DataForSEO coordinate fails closed", () => {
  assert.throws(
    () =>
      dataForSeoLocationCoordinate({
        latitude: null,
        longitude: null
      }),
    /RANKING_TARGET_COORDINATES_REQUIRED/
  );
});

test("Ozoir canonical campaign coordinates", () => {
  const result =
    resolveRankingTargetGeo({
      rankingGridCampaigns: [
        {
        status: "completed",
          id: 18,
          centerLat: 48.76235,
          centerLng: 2.668852
        }
      ]
    });

  assert.equal(
    dataForSeoLocationCoordinate(
      result.coordinates
    ),
    "48.7623500,2.6688520,10z"
  );
});

test("pending campaign cannot override completed campaign", () => {
  const agency = {
    rankingGridCampaigns: [
      {
        id: 200,
        status: "pending",
        centerLat: 10,
        centerLng: 20
      },
      {
        id: 199,
        status: "completed",
        centerLat: 48.761888,
        centerLng: 1.943998
      }
    ]
  };

  const result =
    latestCampaignCoordinates(agency);

  assert.deepEqual(result, {
    latitude: 48.761888,
    longitude: 1.943998,
    source: "ranking_grid_campaign",
    campaignId: 199
  });
});

test("pending-only campaigns cannot become canonical geo", () => {
  const agency = {
    rankingGridCampaigns: [
      {
        id: 300,
        status: "pending",
        centerLat: 48.761888,
        centerLng: 1.943998
      }
    ]
  };

  assert.equal(
    latestCampaignCoordinates(agency),
    null
  );
});

test("invalid completed campaign is skipped for older valid completed campaign", () => {
  const agency = {
    rankingGridCampaigns: [
      {
        id: 400,
        status: "completed",
        centerLat: null,
        centerLng: null
      },
      {
        id: 399,
        status: "completed",
        centerLat: 48.76235,
        centerLng: 2.668852
      }
    ]
  };

  const result =
    latestCampaignCoordinates(agency);

  assert.deepEqual(result, {
    latitude: 48.76235,
    longitude: 2.668852,
    source: "ranking_grid_campaign",
    campaignId: 399
  });
});

test("failed and running campaigns are ignored", () => {
  const agency = {
    rankingGridCampaigns: [
      {
        id: 500,
        status: "running",
        centerLat: 10,
        centerLng: 20
      },
      {
        id: 499,
        status: "failed",
        centerLat: 30,
        centerLng: 40
      },
      {
        id: 498,
        status: "completed",
        centerLat: 47.684432,
        centerLng: 2.631137
      }
    ]
  };

  const result =
    latestCampaignCoordinates(agency);

  assert.equal(
    result.campaignId,
    498
  );
});
