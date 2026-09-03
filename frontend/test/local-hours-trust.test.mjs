import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hours = await readFile(
  new URL("../components/public-site/renderers/HoursRenderer.js", import.meta.url),
  "utf8"
);

test("hours section fallback is locally contextualized", () => {
  assert.match(hours, /Horaires de notre agence à \$\{city\}/);
  assert.match(hours, /getSectionTitle/);
});

test("Google Business Profile synchronization date is semantic", () => {
  assert.match(hours, /<time dateTime=\{data\.syncedAt\}>/);
  assert.match(hours, /Horaires synchronisés avec Google Business Profile/);
});

test("missing synchronization is disclosed instead of pretending freshness", () => {
  assert.match(hours, /Horaires en attente de synchronisation/);
});
