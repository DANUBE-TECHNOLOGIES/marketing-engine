import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicSiteApi = fs.readFileSync(
  path.join(root, "lib/public-site-api.js"),
  "utf8"
);
const publicRenderContract = fs.readFileSync(
  path.join(root, "lib/public-render-contract.js"),
  "utf8"
);
const publicRenderRoute = fs.readFileSync(
  path.join(root, "app/api/public-render-sites/[[...path]]/route.js"),
  "utf8"
);
const registry = fs.readFileSync(
  path.join(root, "components/public-site/renderers/registry.js"),
  "utf8"
);

test("MSE-25.71 SSR public rendering no longer self-fetches the Next public-render API", () => {
  assert.match(publicSiteApi, /loadPublicRenderContract\(siteSlug\)/);
  assert.match(publicSiteApi, /loadPublicRenderContract\(siteSlug, pageSlug\)/);
  assert.doesNotMatch(publicSiteApi, /requestFrom\("\/api\/public-render-sites"/);
  assert.doesNotMatch(publicSiteApi, /requestRender\(/);
});

test("MSE-25.71 compact API uses the shared direct backend contract", () => {
  assert.match(publicRenderRoute, /loadPublicRenderContract/);
  assert.match(publicRenderRoute, /x-public-render-source/);
  assert.match(publicRenderRoute, /backend-direct-shared/);
  assert.doesNotMatch(publicRenderRoute, /\/api\/public-sites/);
});

test("MSE-25.71 keeps Website Designer V2 jsonContent authoritative", () => {
  assert.match(publicRenderContract, /content\?\.__builderType/);
  assert.match(publicRenderContract, /hasJsonContent \? \{ jsonContent: content \} : \{\}/);
  assert.match(publicRenderContract, /block\?\.sectionType/);
});

test("MSE-25.71 restores brand hero fallback and legal runtime aliases", () => {
  assert.match(publicRenderContract, /heroAsset\?\.publicUrl/);
  assert.match(publicRenderContract, /content\.imageUrl = heroAsset\.publicUrl/);
  assert.match(publicRenderContract, /mentions_legales/);
  assert.match(publicRenderContract, /politique-de-confidentialite/);
  assert.match(publicRenderContract, /privacy/);
  assert.match(publicRenderContract, /cookiePolicy/);
  assert.match(publicRenderContract, /legal-profile-/);
});

test("MSE-25.71 keeps critical public block families registered", () => {
  for (const token of [
    "DestinationsRenderer",
    "PartnersRenderer",
    "TeamRenderer",
    "FlexiblePaymentRenderer",
    "ReviewsRenderer",
    "ContactRenderer",
    "HoursRenderer",
  ]) {
    assert.match(registry, new RegExp(token));
  }

  for (const blockType of [
    "destination-recommendations",
    "partner-logos",
    "team-grid",
    "flexible_payment",
    "services-highlight",
  ]) {
    assert.match(registry, new RegExp(blockType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
