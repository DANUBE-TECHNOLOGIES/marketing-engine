import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

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

test("Catlante remains the reference vetted acquisition path while Rivages du Monde waits for masterbrand validation", () => {
  const cruiseSources = read("components/page-builder/shared/partnerCruiseLogoSources.js");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");

  assert.match(cruiseSources, /"catlante-catamarans"[\s\S]*status:\s*"vetted-source"[\s\S]*preferredSource:/);
  assert.match(backlog, /"catlante-catamarans"[\s\S]*state:\s*"source-vetted"/);

  assert.match(cruiseSources, /"rivages-du-monde"[\s\S]*status:\s*"official-source-page"/);
  assert.match(backlog, /"rivages-du-monde"[\s\S]*state:\s*"source-pending"/);
});
