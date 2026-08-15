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

test("public minisite proxy exposes partner assets", () => {
  const proxy = read("proxy.js");
  assert.match(proxy, /pathname === "\/partners"/);
  assert.match(proxy, /pathname\.startsWith\("\/partners\/"\)/);
});
