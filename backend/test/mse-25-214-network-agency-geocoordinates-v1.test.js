"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const schema = fs.readFileSync(
  path.join(root, "prisma/schema.prisma"),
  "utf8"
);

const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260911140000_agency_geocoordinates/migration.sql"
  ),
  "utf8"
);

const service = fs.readFileSync(
  path.join(root, "src/modules/public-site-read/service.js"),
  "utf8"
);

const script = fs.readFileSync(
  path.join(root, "scripts/mse-25-214-melun-geocoordinates.js"),
  "utf8"
);

const frontendJsonLd = fs.readFileSync(
  path.resolve(root, "../frontend/lib/seo/json-ld.js"),
  "utf8"
);

function modelBody(source, name) {
  const start = source.indexOf(`model ${name} {`);
  assert.notEqual(start, -1, `model ${name} absent`);

  const next = source.indexOf("\nmodel ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("Agency expose une persistance géographique nullable réseau", () => {
  const agency = modelBody(schema, "Agency");

  assert.match(agency, /\blatitude\s+Float\?/);
  assert.match(agency, /\blongitude\s+Float\?/);
});

test("migration GEO est additive et bornée", () => {
  assert.match(
    migration,
    /ADD COLUMN "latitude" DOUBLE PRECISION/
  );
  assert.match(
    migration,
    /ADD COLUMN "longitude" DOUBLE PRECISION/
  );
  assert.match(migration, /-90/);
  assert.match(migration, /90/);
  assert.match(migration, /-180/);
  assert.match(migration, /180/);

  assert.doesNotMatch(migration, /\bUPDATE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\b/i);
});

test("PublicSiteRead expose automatiquement les coordonnées Agency", () => {
  assert.match(service, /"latitude"/);
  assert.match(service, /"longitude"/);

  const agencySelectStart = service.indexOf("const agencySelect");
  const siteSelectStart = service.indexOf("const siteSelect");

  assert.ok(agencySelectStart >= 0);
  assert.ok(siteSelectStart > agencySelectStart);

  const agencySelect = service.slice(
    agencySelectStart,
    siteSelectStart
  );

  assert.match(agencySelect, /"latitude"/);
  assert.match(agencySelect, /"longitude"/);
});

test("TravelAgency transforme latitude/longitude en GeoCoordinates", () => {
  assert.match(
    frontendJsonLd,
    /latitude = agency\?\.latitude \?\? site\?\.latitude/
  );
  assert.match(
    frontendJsonLd,
    /longitude = agency\?\.longitude \?\? site\?\.longitude/
  );
  assert.match(frontendJsonLd, /"@type": "GeoCoordinates"/);
  assert.match(frontendJsonLd, /latitude,/);
  assert.match(frontendJsonLd, /longitude,/);
});

test("write Melun est strictement isolé et réversible", () => {
  assert.match(script, /id: 8/);
  assert.match(script, /city: "Melun"/);
  assert.match(script, /postalCode: "77000"/);
  assert.match(script, /latitude: 48\.53612/);
  assert.match(script, /longitude: 2\.65823/);

  assert.match(script, /MSE_25_214_CONFIRM/);
  assert.match(script, /MSE_25_214_ROLLBACK/);
  assert.match(script, /SNAPSHOT/);

  // Le dry-run doit fonctionner avant que la migration soit appliquée.
  assert.match(script, /information_schema\.columns/);
  assert.match(script, /geoColumnsPresent: false/);

  assert.doesNotMatch(script, /Lamorlaye/i);
  assert.doesNotMatch(script, /agency\.updateMany/);
});
