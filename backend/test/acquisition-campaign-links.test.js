"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { NETWORK_AGENCIES } = require("../src/modules/acquisition-funnel");
const { CAMPAIGN, CHANNELS, buildCampaignUrl, buildMatrix } = require("../scripts/mse-25-210-acquisition-campaign-links");

test("MSE-25.210 generates one attribution matrix row per network agency", () => {
  const matrix = buildMatrix();
  assert.equal(matrix.length, NETWORK_AGENCIES.length);
  assert.equal(matrix.length, 9);
  for (const row of matrix) {
    assert.equal(Object.keys(row.links).length, CHANNELS.length);
    assert.equal(row.campaign, CAMPAIGN);
  }
});

test("MSE-25.210 generates canonical deterministic UTM dimensions", () => {
  const agency = NETWORK_AGENCIES.find((item) => item.publicSiteSlug === "gien");
  const channel = CHANNELS.find((item) => item.key === "email");
  const url = new URL(buildCampaignUrl(agency, channel));
  assert.equal(url.pathname, "/acquisition/gien/soleil-hiver");
  assert.equal(url.searchParams.get("utm_source"), "iga");
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), "soleil-hiver-2026-2027");
  assert.equal(url.searchParams.get("utm_content"), "gien-quiz-soleil-hiver");
});

test("MSE-25.210 keeps attribution unique by agency and channel", () => {
  const urls = buildMatrix().flatMap((row) => Object.values(row.links));
  assert.equal(new Set(urls).size, NETWORK_AGENCIES.length * CHANNELS.length);
});
