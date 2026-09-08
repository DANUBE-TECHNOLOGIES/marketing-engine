import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const page = fs.readFileSync(path.resolve(process.cwd(), "app/knowledge/geo/network/gaps/page.js"), "utf8");

test("gaps page consumes the internal exact reconciliation report", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/agent-gap-reconciliation\?limit=100/);
  assert.doesNotMatch(page, /x-knowledge-admin-token/i);
  assert.doesNotMatch(page, /MONDESCALE_AI_/);
});

test("UI states exact-only semantics and keeps human validation", () => {
  assert.match(page, /strictement identique après normalisation/i);
  assert.match(page, /aucun rapprochement sémantique ou fuzzy/i);
  assert.match(page, /ne crée aucune relation/i);
  assert.match(page, /validation et l’enrichissement restent humains/i);
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
});
