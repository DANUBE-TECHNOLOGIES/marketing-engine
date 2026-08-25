import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(ROOT, "..");
const require = createRequire(import.meta.url);
const { buildJourneySummary, MIN_JOURNEYS_FOR_SIGNAL } = require(path.join(REPO, "backend/src/modules/public-conversion-engine/attribution.js"));

function event(journeyId, pageSlug, action, second) {
  return { journeyId, siteSlug: "agency-a", pageSlug, action, occurredAt: new Date(`2026-08-25T08:00:${String(second).padStart(2, "0")}Z`) };
}

test("MSE-25.47 keeps an explicit journey evidence gate", () => {
  assert.equal(MIN_JOURNEYS_FOR_SIGNAL, 5);
});

test("MSE-25.47 identifies a converting transition with enough evidence", () => {
  const events = [];
  for (let i = 0; i < 5; i += 1) {
    const id = `aaaaaaaa-aaaa-aaaa-aaaa-${String(i).padStart(12, "0")}`;
    events.push(event(id, "home", "page_view", i * 2));
    events.push(event(id, "contact", "phone", i * 2 + 1));
  }
  const summary = buildJourneySummary(events);
  const transition = summary.intelligence.transitions.find((item) => item.transition === "home → contact");
  assert.equal(transition.journeys, 5);
  assert.equal(transition.commercialRate, 100);
  assert.equal(transition.evidence, "usable");
  assert.equal(summary.intelligence.strengths[0].transition, "home → contact");
});

test("MSE-25.47 detects a terminal non-commercial page as potential friction", () => {
  const events = [];
  for (let i = 0; i < 5; i += 1) {
    const id = `bbbbbbbb-bbbb-bbbb-bbbb-${String(i).padStart(12, "0")}`;
    events.push(event(id, "home", "page_view", i * 2));
    events.push(event(id, "services", "service_explore", i * 2 + 1));
  }
  const summary = buildJourneySummary(events);
  const friction = summary.intelligence.frictionPoints.find((item) => item.pageSlug === "services");
  assert.ok(friction);
  assert.equal(friction.terminalRate, 100);
  assert.equal(friction.commercialRate, 0);
});

test("MSE-25.47 refuses recommendations below the journey evidence gate", () => {
  const events = [
    event("cccccccc-cccc-cccc-cccc-000000000001", "home", "page_view", 0),
    event("cccccccc-cccc-cccc-cccc-000000000001", "contact", "phone", 1),
  ];
  const summary = buildJourneySummary(events);
  assert.equal(summary.intelligence.transitions[0].evidence, "insufficient");
  assert.equal(summary.intelligence.strengths.length, 0);
  assert.equal(summary.intelligence.frictionPoints.length, 0);
});

test("MSE-25.47 remains advisory and read-only", () => {
  const summary = buildJourneySummary([]);
  assert.equal(summary.intelligence.mode, "read-only-recommendations");
  assert.equal(summary.intelligence.evidenceGate, "5-journeys");
});
