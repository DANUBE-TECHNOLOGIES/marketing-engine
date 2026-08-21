import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

function assertPendingOrFinalized({ id, backlog, catalogue }) {
  const pending = new RegExp(`id:\\s*"${id}"[^\\n]*state:\\s*"source-pending"`).test(backlog);
  const finalized = new RegExp(`P\\("${id}"[^\\n]*"\\/partners\\/(?:manual\\/)?${id}\\.(?:svg|webp)"\\)`).test(catalogue);
  assert.ok(pending || finalized, `${id} must be either pending or finalized with a public asset`);
}

test("generic partner logo acquisition is gated by vetted backlog and registry states", () => {
  const acquire = read("scripts/partner-logo-acquire.mjs");
  assert.match(acquire, /backlog\.state !== "source-vetted"/);
  assert.match(acquire, /source\.status !== "vetted-source"/);
  assert.match(acquire, /preferredSource \|\| source\?\.assetUrl/);
  assert.match(acquire, /\["webp", "svg"\]\.includes\(outputFormat\)/);
  assert.match(acquire, /PNG source requires a WebP converter/);
  assert.match(acquire, /--write=true/);
  assert.match(acquire, /written:\s*false/);
  assert.match(acquire, /if \(write\)/);
});

test("finalized logo sources leave the active backlog while unresolved official sources remain eligible for network rollout", () => {
  const cruiseSources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const catalogue = read("components/page-builder/shared/fullPartners.js");

  assert.match(cruiseSources, /"catlante-catamarans"[\s\S]*status:\s*"vetted-source"[\s\S]*preferredSource:/);
  assert.match(catalogue, /P\("catlante-catamarans"[^\n]*"\/partners\/catlante-catamarans\.(?:svg|webp)"\)/);
  assert.doesNotMatch(backlog, /id:\s*"catlante-catamarans"/);

  assert.match(cruiseSources, /"rivages-du-monde"[\s\S]*status:\s*"official-source-page"/);
  assertPendingOrFinalized({ id: "rivages-du-monde", backlog, catalogue });
});
