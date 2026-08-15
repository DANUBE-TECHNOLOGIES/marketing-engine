import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("public partner renderer is backed by the canonical network catalogue", () => {
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");
  const catalogue = read("components/page-builder/shared/commonPartners.js");
  const registry = read("components/public-site/renderers/registry.js");

  assert.match(renderer, /getCommonPartners/);
  assert.match(renderer, /item\.group === "tui"/);
  assert.match(registry, /logos:\s*PartnersRenderer/);
  assert.match(registry, /partners:\s*PartnersRenderer/);
  assert.match(registry, /"partner-logos":\s*PartnersRenderer/);

  for (const expected of [
    'id: "fram"',
    'id: "tui-univers"',
    'id: "club-med"',
    'id: "msc-croisieres"',
    'id: "costa-croisieres"',
    'id: "kuoni"',
    'id: "exotismes"',
  ]) {
    assert.match(catalogue, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(catalogue, /salaun/i);
  assert.doesNotMatch(catalogue, /common-partners-sprite/i);
});

test("Website Designer exposes at most three agency-specific partners", () => {
  const editor = read("components/page-builder-v2/BlockListEditors.js");
  const builder = read("components/page-builder-v2/VisualPageBuilder.js");
  const catalogue = read("lib/page-builder-v2/block-catalog.js");
  const renderer = read("components/public-site/renderers/PartnersRenderer.js");

  assert.match(editor, /export function PartnerLogosEditor/);
  assert.match(editor, /maxAgencyPartners = 3/);
  assert.match(editor, /getCommonPartners\(\)/);
  assert.match(editor, /logoAssetId/);
  assert.match(editor, /Texte alternatif/);
  assert.match(editor, /Lien facultatif/);

  assert.match(builder, /PartnerLogosEditor/);
  assert.match(builder, /block\.type === "partner-logos"/);
  assert.match(builder, /agencyPartners=\{content\.agencyPartners\}/);

  assert.match(catalogue, /type: "partner-logos"/);
  assert.match(catalogue, /agencyPartners: \[\]/);
  assert.match(catalogue, /maxAgencyPartners: 3/);

  assert.match(renderer, /content\.agencyPartners/);
  assert.match(renderer, /maxAgencyPartners/);
  assert.match(renderer, /item\.href/);
});

test("public minisite proxy exposes partner assets", () => {
  const proxy = read("proxy.js");
  assert.match(proxy, /pathname === "\/partners"/);
  assert.match(proxy, /pathname\.startsWith\("\/partners\/"\)/);
});
