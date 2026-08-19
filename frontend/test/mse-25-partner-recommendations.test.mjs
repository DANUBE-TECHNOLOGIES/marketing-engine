import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("partner recommendations derive weighted signals from the full minisite", () => {
  const recommendations = read("components/page-builder/shared/partnerRecommendations.js");

  assert.match(recommendations, /export function buildPartnerRecommendationSignals/);
  assert.match(recommendations, /SIGNAL_BLOCK_TYPES/);
  for (const blockType of ["destinations", "offers", "inspirations", "services-highlight", "agency-story"]) {
    assert.match(recommendations, new RegExp(`"${blockType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(recommendations, /block:\$\{type\}/);
  assert.match(recommendations, /page-seo-description/);
  assert.match(recommendations, /isActive \? 4 : 3/);
  assert.match(recommendations, /function flattenContent/);
  assert.match(recommendations, /imageUrl/);
  assert.match(recommendations, /logoUrl/);
  assert.match(recommendations, /function normalizeSignals/);
  assert.match(recommendations, /score \+= signal\.weight/);
  assert.match(recommendations, /if \(limit === 0\) return \[\]/);
});

test("partner editor consumes minisite signals while keeping manual focus as an override", () => {
  const editor = read("components/page-builder-v2/BlockListEditors.js");

  assert.match(editor, /recommendationSignals: providedRecommendationSignals = \[\]/);
  assert.match(editor, /minisiteSignals = null/);
  assert.match(editor, /Array\.isArray\(minisiteSignals\)/);
  assert.match(editor, /: providedRecommendationSignals/);
  assert.match(editor, /Déduire du mini-site/);
  assert.match(editor, /source: "manual-focus", weight: 8/);
  assert.match(editor, /source: "selected-partner", weight: 2/);
  assert.match(editor, /\.\.\.siteSignals, \.\.\.selectedSignals/);
  assert.match(editor, /recommendAgencyPartners\(\{/);
  assert.match(editor, /max: Math\.max\(0, maxAgencyPartners - agency\.length\)/);
  assert.match(editor, /const addRecommendation = \(entry\) =>/);
  assert.match(editor, /onClick=\{\(\) => addRecommendation\(entry\)\}/);
  assert.match(editor, /aucun choix n’est appliqué sans votre action/);
  assert.doesNotMatch(editor, /useEffect\(\(\) =>\s*addRecommendation/);
  assert.doesNotMatch(editor, /\.forEach\(addRecommendation\)/);
});

test("VisualPageBuilder wires live minisite signals into PartnerLogosEditor", () => {
  const builder = read("components/page-builder-v2/VisualPageBuilder.js");

  assert.match(builder, /buildPartnerRecommendationSignals/);
  assert.match(builder, /const partnerRecommendationSignals = useMemo\(/);
  assert.match(builder, /buildPartnerRecommendationSignals\(site, activePage\)/);
  assert.match(builder, /partnerRecommendationSignals = \[\]/);
  assert.match(builder, /minisiteSignals=\{partnerRecommendationSignals\}/);
  assert.match(builder, /partnerRecommendationSignals=\{partnerRecommendationSignals\}/);
});
