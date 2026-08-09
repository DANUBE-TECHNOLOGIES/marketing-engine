import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("website builder reads approved offer catalog through tenant-scoped campaigns", () => {
  const proxy = read(
    "app/api/website-builder/agencies/[agencyId]/offers/route.js"
  );
  const api = read("lib/page-builder-v2/page-builder-api.js");

  assert.match(proxy, /\/campaigns\/options\/offers/);
  assert.match(proxy, /searchParams\.set\(["']agencyId["'],\s*agencyId\)/);
  assert.match(proxy, /["']x-tenant-slug["']:\s*TENANT_SLUG/);
  assert.doesNotMatch(proxy, /public-site-read\/agencies/);
  assert.match(proxy, /cache-control["']:\s*["']private, no-store/);

  assert.match(api, /export async function fetchApprovedOffers/);
  assert.match(
    api,
    /\/api\/website-builder\/agencies\/\$\{encodeURIComponent\([\s\S]*agencyId[\s\S]*\)\}\/offers/
  );
});

test("public offer cards honor approved campaign links safely", () => {
  const renderer = read("components/public-site/renderers/OffersRenderer.js");

  assert.match(renderer, /resolvePublicCtaHref/);
  assert.match(renderer, /item\.href/);
  assert.match(renderer, /Voir l’offre/);
  assert.match(renderer, /Demander un devis/);
});

test("new V2 offer blocks default to approved campaigns", () => {
  const catalog = read("lib/page-builder-v2/block-catalog.js");

  assert.match(
    catalog,
    /type:\s*["']offers["'][\s\S]*source:\s*["']campaign["']/
  );

  // Existing saved blocks keep their serialized source and remain compatible
  // with manual offerIds; only newly created blocks inherit this default.
});
