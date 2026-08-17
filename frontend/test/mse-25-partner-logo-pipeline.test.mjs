import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("generic partner logo discovery stays read-only and respects publication holds", () => {
  const discovery = read("scripts/partner-logo-source-discovery.mjs");

  assert.match(discovery, /discover-only-no-write/);
  assert.match(discovery, /identity-review/);
  assert.match(discovery, /catalogue-excluded/);
  assert.match(discovery, /asset-permission-review/);
  assert.match(discovery, /--category=/);
  assert.match(discovery, /--partner=/);
  assert.match(discovery, /favicon|icon|sprite|payment|social/);
});

test("generic partner logo acquisition requires two-stage vetting and explicit overwrite", () => {
  const acquire = read("scripts/partner-logo-acquire.mjs");

  assert.match(acquire, /backlog\.state !== "source-vetted"/);
  assert.match(acquire, /source\.status !== "vetted-source"/);
  assert.match(acquire, /preferredSource \|\| source\?\.assetUrl/);
  assert.match(acquire, /--write=true/);
  assert.match(acquire, /--overwrite=true/);
  assert.match(acquire, /existingAcceptedAssets/);
  assert.match(acquire, /partner already has accepted public asset/);
  assert.match(acquire, /\["webp", "svg"\]/);
  assert.match(acquire, /refusing to publish PNG/);
});

test("Rivages du Monde is wired through catalogue, cruise details and logo sourcing", () => {
  const catalogue = read("components/page-builder/shared/fullPartners.js");
  const details = read("components/page-builder/shared/partnerCruiseDetails.js");
  const sources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");

  assert.match(catalogue, /P\("rivages-du-monde",\s*"Rivages du Monde",\s*"croisieres"/);
  assert.match(details, /"rivages-du-monde"[\s\S]*Croisière fluviale/);
  assert.match(sources, /"rivages-du-monde"[\s\S]*rivagesdumonde\.fr/);
  assert.match(backlog, /rivages-du-monde[\s\S]*croisieres[\s\S]*source-pending/);
});
