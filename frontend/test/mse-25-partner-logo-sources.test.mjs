import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("partner logo sourcing keeps vetted assets separate from press and permission reviews", () => {
  const cruiseSources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const circuitSources = read("components/page-builder/shared/partnerCircuitLogoSources.js");
  const staySources = read("components/page-builder/shared/partnerStayLogoSources.js");
  const verification = read("components/page-builder/shared/partnerVerification.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const queue = read("scripts/partner-logo-work-queue.mjs");
  const assetTest = read("test/mse-25-partner-assets.test.mjs");

  assert.match(cruiseSources, /"catlante-catamarans"/);
  assert.match(cruiseSources, /status:\s*"vetted-source"/);
  assert.match(cruiseSources, /catlante-catamarans\.svg/);
  assert.match(cruiseSources, /croisieurope[\s\S]*official-press-room/);
  assert.match(cruiseSources, /explora-journeys[\s\S]*official-press-kit/);
  assert.match(cruiseSources, /hurtigruten[\s\S]*official-press-library/);
  assert.match(cruiseSources, /cfc[\s\S]*permission-review/);

  assert.match(circuitSources, /double-sens[\s\S]*official-site/);
  assert.match(circuitSources, /la-francaise-des-circuits[\s\S]*official-site/);
  assert.match(circuitSources, /salaun-holidays[\s\S]*permission-review/);
  assert.match(circuitSources, /nordiska[\s\S]*permission-review/);
  assert.match(circuitSources, /pouchkine-tours[\s\S]*permission-review/);
  assert.match(circuitSources, /getCircuitLogoSource/);

  assert.match(staySources, /belambra[\s\S]*permission-review/);
  assert.match(staySources, /boomerang[\s\S]*official-source-page/);
  assert.match(staySources, /mondial-tourisme[\s\S]*official-source-page/);
  assert.match(staySources, /heliades[\s\S]*permission-review/);
  assert.match(staySources, /voyamar[\s\S]*permission-review/);
  assert.match(staySources, /getStayLogoSource/);

  for (const id of ["belambra", "heliades", "voyamar"]) {
    assert.match(verification, new RegExp(`${id}[\\s\\S]*asset-permission-review`));
    assert.match(backlog, new RegExp(`${id}[\\s\\S]*permission-required`));
  }
  assert.match(backlog, /worldia[\s\S]*catalogue-excluded/);

  assert.match(queue, /official-individual-assets-webp-or-vetted-svg/);
  assert.match(queue, /acceptedFormats:\s*\["webp", "svg"\]/);
  assert.match(queue, /currentFormat/);

  assert.match(assetTest, /\(\?:webp\|svg\)/);
  assert.match(assetTest, /<svg\\b/);
});
