import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("cruise logo sourcing keeps vetted assets separate from press and permission reviews", () => {
  const sources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const queue = read("scripts/partner-logo-work-queue.mjs");
  const assetTest = read("test/mse-25-partner-assets.test.mjs");

  assert.match(sources, /"catlante-catamarans"/);
  assert.match(sources, /status:\s*"vetted-source"/);
  assert.match(sources, /catlante-catamarans\.svg/);
  assert.match(sources, /croisieurope[\s\S]*official-press-room/);
  assert.match(sources, /explora-journeys[\s\S]*official-press-kit/);
  assert.match(sources, /hurtigruten[\s\S]*official-press-library/);
  assert.match(sources, /cfc[\s\S]*permission-review/);

  assert.match(queue, /official-individual-assets-webp-or-vetted-svg/);
  assert.match(queue, /acceptedFormats:\s*\["webp", "svg"\]/);
  assert.match(queue, /currentFormat/);

  assert.match(assetTest, /\(\?:webp\|svg\)/);
  assert.match(assetTest, /<svg\\b/);
});
