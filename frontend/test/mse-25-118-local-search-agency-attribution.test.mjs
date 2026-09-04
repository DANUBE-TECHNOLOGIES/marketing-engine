import assert from "node:assert/strict";
import test from "node:test";

import {
  attributeSearchConsoleRow,
  buildAgencyAttributionAudit,
} from "../lib/seo/local-search-agency-attribution.js";

const agencies = [
  { agencyKey: "dax", city: "Dax" },
  { agencyKey: "bois-colombes", city: "Bois-Colombes", aliases: ["Colombes"] },
  { agencyKey: "maurepas", city: "Maurepas" },
  { agencyKey: "lamorlaye", city: "Lamorlaye" },
  { agencyKey: "ozoir", city: "Ozoir la Ferrière", aliases: ["Ozoir"] },
  { agencyKey: "nevers", city: "Nevers" },
  { agencyKey: "gien", city: "Gien" },
];

test("MSE-25.118d attributes only deterministic commercial/local queries", () => {
  const dax = attributeSearchConsoleRow(
    { query: "agence de voyage dax", clicks: 0, impressions: 64 },
    agencies
  );
  assert.equal(dax.attribution, "attributed");
  assert.equal(dax.agencyKey, "dax");
  assert.equal(dax.confidence, "deterministic");

  const lamorlayeNoise = attributeSearchConsoleRow(
    { query: "lamorlaye plage", clicks: 0, impressions: 16 },
    agencies
  );
  assert.equal(lamorlayeNoise.attribution, "noise");
  assert.equal(lamorlayeNoise.agencyKey, "lamorlaye");

  const ozoirNoise = attributeSearchConsoleRow(
    { query: "activities ozoir", clicks: 0, impressions: 1 },
    agencies
  );
  assert.equal(ozoirNoise.attribution, "noise");
  assert.equal(ozoirNoise.agencyKey, "ozoir");
});

test("MSE-25.118d never assigns broad queries without an agency place signal", () => {
  const broad = attributeSearchConsoleRow(
    { query: "voyages", clicks: 0, impressions: 882 },
    agencies
  );
  assert.equal(broad.attribution, "unmapped");
  assert.equal(broad.agencyKey, null);
});

test("MSE-25.118d produces conservative agency audits from query-level evidence", () => {
  const rows = [
    { query: "agence de voyage dax", clicks: 0, impressions: 64 },
    { query: "agence voyage dax", clicks: 0, impressions: 21 },
    { query: "agence de voyage bois colombes", clicks: 0, impressions: 9 },
    { query: "agence de voyage colombes", clicks: 0, impressions: 17 },
    { query: "agence de voyage maurepas", clicks: 0, impressions: 3 },
    { query: "lamorlaye plage", clicks: 0, impressions: 16 },
    { query: "activities ozoir", clicks: 0, impressions: 1 },
    { query: "agence de voyage nevers", clicks: 3, impressions: 42 },
    { query: "agence voyages nevers", clicks: 0, impressions: 19 },
    { query: "agence voyage nevers", clicks: 0, impressions: 11 },
    { query: "fram nevers", clicks: 0, impressions: 10 },
    { query: "agence de voyage gien", clicks: 1, impressions: 10 },
    { query: "fram gien", clicks: 0, impressions: 8 },
  ];

  const audit = buildAgencyAttributionAudit(rows, agencies);
  const byKey = Object.fromEntries(audit.agencies.map((agency) => [agency.agencyKey, agency]));

  assert.equal(byKey.dax.impressions, 85);
  assert.equal(byKey.dax.signal, "visibility-no-clicks");
  assert.equal(byKey["bois-colombes"].impressions, 26);
  assert.equal(byKey["bois-colombes"].signal, "visibility-no-clicks");
  assert.equal(byKey.maurepas.signal, "low-volume");
  assert.equal(byKey.lamorlaye.signal, "no-data");
  assert.equal(byKey.ozoir.signal, "no-data");
  assert.equal(byKey.nevers.impressions, 82);
  assert.equal(byKey.nevers.clicks, 3);
  assert.equal(byKey.nevers.signal, "observed");
  assert.equal(byKey.gien.signal, "low-volume");
  assert.equal(audit.noise.length, 2);
  assert.equal(audit.automatedPublicChangeAllowed, false);
  assert.equal(audit.googleWriteAllowed, false);
});

test("MSE-25.118d keeps ambiguous location matches out of agency aggregates", () => {
  const ambiguousAgencies = [
    { agencyKey: "a", city: "Colombes" },
    { agencyKey: "b", city: "Bois-Colombes", aliases: ["Colombes"] },
  ];
  const row = attributeSearchConsoleRow(
    { query: "agence de voyage colombes", clicks: 0, impressions: 17 },
    ambiguousAgencies
  );
  assert.equal(row.attribution, "ambiguous");
  assert.equal(row.agencyKey, null);
});
