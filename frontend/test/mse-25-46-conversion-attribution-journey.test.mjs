import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const require = createRequire(import.meta.url);
const { buildJourneySummary, normalizeJourneyId, validateJourneyInput } = require(
  path.join(REPO, "backend/src/modules/public-conversion-engine/attribution.js")
);
const capture = fs.readFileSync(path.join(ROOT, "components/public-site/PublicConversionCapture.js"), "utf8");
const routes = fs.readFileSync(path.join(REPO, "backend/src/modules/public-conversion-engine/routes.js"), "utf8");
const proxy = fs.readFileSync(path.join(ROOT, "proxy.js"), "utf8");
const migration = fs.readFileSync(path.join(REPO, "backend/prisma/migrations/20260824193000_mse_25_46_conversion_journey/migration.sql"), "utf8");

test("MSE-25.46 accepts only opaque anonymous journey identifiers", () => {
  assert.equal(normalizeJourneyId("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(normalizeJourneyId("john@example.com"), null);
  assert.equal(normalizeJourneyId("127.0.0.1"), null);
});

test("MSE-25.46 validates a privacy-minimal journey event", () => {
  const event = validateJourneyInput({
    journeyId: "550e8400-e29b-41d4-a716-446655440000",
    pageSlug: "services",
    pagePath: "/agence/demo/services?utm_source=x",
    intent: "service",
    action: "service_explore",
    placement: "public-site-services",
    referrerPath: "/agence/demo",
  }, { siteSlug: "demo" });
  assert.equal(event.pagePath, "/agence/demo/services");
  assert.equal(event.referrerPath, "/agence/demo");
  assert.equal("label" in event, false);
  assert.equal("target" in event, false);
});

test("MSE-25.46 reconstructs ordered commercial journeys", () => {
  const events = [
    { journeyId: "a", siteSlug: "demo", pageSlug: "home", action: "page_view", occurredAt: "2026-08-24T10:00:00Z" },
    { journeyId: "a", siteSlug: "demo", pageSlug: "destinations", action: "destination_explore", occurredAt: "2026-08-24T10:01:00Z" },
    { journeyId: "a", siteSlug: "demo", pageSlug: "contact", action: "phone", occurredAt: "2026-08-24T10:02:00Z" },
    { journeyId: "b", siteSlug: "demo", pageSlug: "home", action: "page_view", occurredAt: "2026-08-24T11:00:00Z" },
  ];
  const result = buildJourneySummary(events);
  assert.equal(result.journeyCount, 2);
  assert.equal(result.multiStepJourneyCount, 1);
  assert.equal(result.commercialJourneyCount, 1);
  assert.equal(result.commercialJourneyRate, 50);
  assert.match(result.topPaths[0].path, /home:page_view/);
  assert.match(result.topPaths[0].path, /contact:phone/);
});

test("MSE-25.46 uses sessionStorage and no cookie or localStorage identity", () => {
  assert.match(capture, /sessionStorage\.getItem\(JOURNEY_KEY\)/);
  assert.match(capture, /crypto\?\.randomUUID|crypto\.randomUUID|globalThis\.crypto\?\.randomUUID/);
  assert.doesNotMatch(capture, /localStorage/);
  assert.doesNotMatch(capture, /document\.cookie/);
});

test("MSE-25.46 capabilities remain present in the current conversion engine", () => {
  assert.match(routes, /version:\s*"25\.(?:4[6-9]|[5-9][0-9])\.0"/);
  assert.match(routes, /journeyAttribution:\s*"anonymous-session-storage"/);
  assert.match(routes, /writeMode:\s*"append-only"/);
  assert.match(routes, /router\.post\("\/public\/conversions\/sites\/:siteSlug\/journeys"/);
  assert.match(routes, /router\.get\("\/api\/conversions\/journeys"/);
});

test("MSE-25.46 exposes only event and journey POST ingestion on the public hostname", () => {
  assert.match(proxy, /request\.method === "POST"/);
  assert.match(proxy, /\(\?:events\|journeys\)/);
  assert.match(proxy, /POST \/api\/public-conversions\/:siteSlug\/journeys are anonymous/);
  assert.match(proxy, /Aggregate analysis routes remain behind Local Engine authentication/);
  assert.doesNotMatch(proxy, /pathname\.startsWith\("\/api\/public-conversions\/"\)/);
});

test("MSE-25.46 migration stores no direct personal identifier", () => {
  assert.match(migration, /PublicConversionJourneyEvent/);
  assert.match(migration, /journeyId/);
  assert.doesNotMatch(migration, /ipAddress|userAgent|email|phone|cookie/i);
});
