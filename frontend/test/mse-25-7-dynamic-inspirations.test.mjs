import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.7 expose le catalogue éditorial publié au Website Designer", () => {
  const route = source("app/api/website-builder/inspirations/route.js");
  const api = source("lib/page-builder-v2/page-builder-api.js");

  assert.match(route, /\/ai-content\/published/);
  assert.match(route, /x-tenant-slug/);
  assert.match(route, /cache:\s*"no-store"/);
  assert.match(api, /fetchPublishedInspirations/);
  assert.match(api, /\/api\/website-builder\/inspirations/);
});

test("MSE-25.7 permet source automatique ou saisie manuelle dans le vrai Designer", () => {
  const registry = source("lib/website-builder/inspector-registry.js");
  const inspector = source("components/website-builder/SectionInspector.js");

  assert.match(registry, /inspirations:[\s\S]*?Source des inspirations/);
  assert.match(registry, /content-generation/);
  assert.match(registry, /Saisie manuelle/);
  assert.match(registry, /selectionMode/);
  assert.match(inspector, /InspirationReferenceSelector/);
  assert.match(inspector, /contentIds/);
  assert.match(inspector, /Articles publiés/);
});

test("MSE-25.7 masque les réglages catalogue et le panneau automatique en saisie manuelle", () => {
  const inspector = source("components/website-builder/SectionInspector.js");

  assert.match(inspector, /inspectorFieldVisible/);
  assert.match(
    inspector,
    /inspirationSource === "manual"[\s\S]*?\["selectionMode", "limit"\]\.includes\(fieldKey\)/
  );
  assert.match(
    inspector,
    /block\.type === "inspirations"[\s\S]*?inspirationSource === "content-generation"[\s\S]*?: Boolean/
  );
});

test("MSE-25.7 conserve le renderer public inspirations", () => {
  const renderer = source("components/public-site/renderers/InspirationsRenderer.js");

  assert.match(renderer, /public-site-inspirations/);
  assert.match(renderer, /"items",[\s\S]*?"articles",[\s\S]*?"inspirations"/);
  assert.match(renderer, /item\.description/);
  assert.match(renderer, /item\.image/);
});
