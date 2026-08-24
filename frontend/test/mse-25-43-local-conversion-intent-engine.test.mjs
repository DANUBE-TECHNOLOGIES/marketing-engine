import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const require = createRequire(import.meta.url);
function read(relative) { return fs.readFileSync(path.join(REPO, relative), "utf8"); }

const contract = require(path.join(REPO, "backend/src/modules/public-conversion-engine/contract.js"));
const { buildFunnel } = require(path.join(REPO, "backend/src/modules/public-conversion-engine/service.js"));
const capture = read("frontend/components/public-site/PublicConversionCapture.js");
const layout = read("frontend/app/agence/[siteSlug]/layout.js");
const eventProxy = read("frontend/app/api/public-conversions/[siteSlug]/events/route.js");
const middlewareProxy = read("frontend/proxy.js");
const summaryProxy = read("frontend/app/api/public-conversions/summary/route.js");
const dashboard = read("frontend/app/conversion-intent/page.js");
const routes = read("backend/src/modules/public-conversion-engine/routes.js");
const service = read("backend/src/modules/public-conversion-engine/service.js");
const register = read("backend/src/modules/register-modules.js");
const migration = read("backend/prisma/migrations/20260824114500_mse_25_43_public_conversion_events/migration.sql");

test("MSE-25.43 contract keeps a closed conversion taxonomy", () => {
  assert.equal(contract.ACTIONS.has("page_view"), true);
  assert.equal(contract.ACTIONS.has("quote_request"), true);
  assert.equal(contract.ACTIONS.has("phone"), true);
  assert.equal(contract.ACTIONS.has("payment_options"), true);
  assert.equal(contract.INTENTS.has("flexible_payment"), true);
  assert.equal(contract.INTENTS.has("flight_ticketing"), true);
  assert.throws(() => contract.validateConversionInput({ action: "arbitrary", intent: "general_travel", placement: "x" }, { siteSlug: "demo" }));
});

test("MSE-25.43 strips PII-bearing targets before persistence", () => {
  assert.equal(contract.normalizeTarget("tel:+33123456789"), "tel");
  assert.equal(contract.normalizeTarget("mailto:person@example.com"), "mailto");
  assert.equal(contract.normalizeTarget("/agence/demo/contact?email=person@example.com"), "/agence/demo/contact");
  assert.equal(contract.normalizeTarget("https://example.org/path?client=abc"), "external:example.org");
});

test("MSE-25.43 bounds public event timestamps", () => {
  const now = new Date("2026-08-24T10:00:00.000Z");
  assert.equal(contract.normalizeOccurredAt("2026-08-24T09:30:00.000Z", now).toISOString(), "2026-08-24T09:30:00.000Z");
  assert.equal(contract.normalizeOccurredAt("2020-01-01T00:00:00.000Z", now).toISOString(), now.toISOString());
});

test("MSE-25.43 mounts one capture layer for every public agency page", () => {
  assert.match(layout, /PublicConversionCapture/);
  assert.match(layout, /<PublicConversionCapture siteSlug=\{siteSlug\} \/>/);
  assert.match(capture, /usePathname/);
  assert.match(capture, /action:\s*"page_view"/);
  assert.match(capture, /document\.addEventListener\("click"/);
  assert.match(capture, /navigator\.sendBeacon/);
  assert.match(capture, /keepalive:\s*true/);
});

test("MSE-25.43 captures commercial link families without blocking navigation", () => {
  assert.match(capture, /quote_request/);
  assert.match(capture, /payment_options/);
  assert.match(capture, /partner_outbound/);
  assert.match(capture, /data-partner-directory/);
  assert.match(capture, /directions/);
  assert.doesNotMatch(capture, /preventDefault\(/);
});

test("MSE-25.43 exposes a same-origin frontend proxy and first-party backend endpoints", () => {
  assert.match(eventProxy, /\/public\/conversions\/sites\/\$\{encodeURIComponent\(siteSlug\)\}\/events/);
  assert.match(eventProxy, /x-tenant-slug/);
  assert.match(summaryProxy, /\/api\/conversions\/summary/);
  assert.match(routes, /\/public\/conversions\/sites\/:siteSlug\/events/);
  assert.match(routes, /\/api\/conversions\/summary/);
  assert.match(routes, /status\(202\)/);
});

test("MSE-25.43 exposes only POST event ingestion anonymously through frontend proxy", () => {
  assert.match(middlewareProxy, /function isPublicConversionIngest/);
  assert.match(middlewareProxy, /request\.method === "POST"/);
  assert.match(middlewareProxy, /public-conversions\\\/\[\^\/\]\+\\\/events/);
  assert.match(middlewareProxy, /publicConversionIngest/);
  assert.match(middlewareProxy, /Aggregates \(\/api\/public-conversions\/summary\) remain behind Local Engine/);
  assert.doesNotMatch(middlewareProxy, /pathname\.startsWith\("\/api\/public-conversions\/"\)/);
});

test("MSE-25.43 computes page-level funnel baselines", () => {
  const funnel = buildFunnel([
    { siteSlug: "demo", pageSlug: "home", action: "page_view", events: 100 },
    { siteSlug: "demo", pageSlug: "home", action: "phone", events: 7 },
    { siteSlug: "demo", pageSlug: "home", action: "contact", events: 3 },
  ]);
  assert.equal(funnel.pageViews, 100);
  assert.equal(funnel.conversionEvents, 10);
  assert.equal(funnel.conversionRate, 10);
  assert.equal(funnel.pages[0].conversionRate, 10);
});

test("MSE-25.43 provides a manager dashboard for conversion intent metrics", () => {
  assert.match(dashboard, /Conversion & Intent/);
  assert.match(dashboard, /requireRole\(\["admin", "manager"\]\)/);
  assert.match(dashboard, /Vues de pages/);
  assert.match(dashboard, /Taux interaction \/ vue/);
});

test("MSE-25.43 bounds anonymous ingestion without storing an IP identifier", () => {
  assert.match(routes, /createSiteRateGuard/);
  assert.match(routes, /limit = 300/);
  assert.match(routes, /PUBLIC_CONVERSION_RATE_LIMITED/);
  assert.doesNotMatch(routes, /request\.ip|x-forwarded-for|user-agent/i);
});

test("MSE-25.43 persists only privacy-minimal conversion context", () => {
  assert.match(service, /PublicConversionEvent/);
  assert.doesNotMatch(service, /userAgent|ipAddress|clientEmail|clientPhone|cookieId/);
  assert.match(migration, /CREATE TABLE "PublicConversionEvent"/);
  assert.doesNotMatch(migration, /email|phone|userAgent|ipAddress|cookie/i);
});

test("MSE-25.43 registers the conversion engine through the modular runtime", () => {
  assert.match(register, /public-conversion-engine/);
  assert.match(register, /publicConversionEngine\.routes/);
});
