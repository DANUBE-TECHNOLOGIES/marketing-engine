import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routePath =
  "frontend/app/agence/[siteSlug]/[[...pageSlug]]/page.js";
const areaPath =
  "frontend/lib/seo/local-area-config.js";
const editorialPath =
  "backend/src/modules/minisite-seo-enrichment/editorial-hardening-patch.js";

const route = fs.readFileSync(routePath, "utf8");
const area = fs.readFileSync(areaPath, "utf8");
const editorial = fs.readFileSync(editorialPath, "utf8");

test("MSE-25.258 legacy Melun slug maps to permanent canonical slug", () => {
  assert.match(
    route,
    /"tui-store-melun"\s*:\s*"ambassade-fram-mondescale-melun"/
  );

  assert.match(
    route,
    /if\s*\(isAliasSite\(resolved\.siteSlug\)\)[\s\S]*?permanentRedirect/
  );
});

test("MSE-25.258 legacy redirect preserves requested page slug", () => {
  assert.match(
    route,
    /siteSlug:\s*canonicalSiteSlug\(resolved\.siteSlug\)[\s\S]*?pageSlug/
  );
});

test("MSE-25.258 redirect occurs before database-backed site loading", () => {
  const pageEntry = route.indexOf(
    "export default async function AgencySitePage"
  );

  assert.notEqual(pageEntry, -1);

  const pageBody = route.slice(pageEntry);
  const redirect = pageBody.indexOf(
    "if (isAliasSite(resolved.siteSlug))"
  );
  const load = pageBody.indexOf(
    "publicSiteApi.getSite(resolved.siteSlug)"
  );

  assert.notEqual(redirect, -1);
  assert.notEqual(load, -1);
  assert.ok(redirect < load);
});

test("MSE-25.258 local-area ownership follows canonical Melun slug", () => {
  assert.match(
    area,
    /"ambassade-fram-mondescale-melun"\s*:\s*\[/
  );

  assert.doesNotMatch(
    area,
    /"tui-store-melun"\s*:\s*\[/
  );
});

test("MSE-25.258 editorial exclusion follows canonical Melun slug", () => {
  assert.match(
    editorial,
    /DEFAULT_EXCLUDED_SITE_SLUGS[\s\S]*?"ambassade-fram-mondescale-melun"/
  );
});

test("MSE-25.258 contains no database mutation implementation", () => {
  const patch = route + "\n" + area + "\n" + editorial;

  assert.doesNotMatch(
    patch,
    /\.(update|updateMany|create|createMany|delete|deleteMany|upsert)\s*\(/
  );
});

test("MSE-25.260 metadata redirects legacy Melun before database-backed loading", () => {
  const metadataStart = route.indexOf(
    "export async function generateMetadata({ params })"
  );

  const pageStart = route.indexOf(
    "export default async function AgencySitePage"
  );

  assert.ok(metadataStart >= 0, "generateMetadata must exist");
  assert.ok(pageStart > metadataStart, "page component must follow generateMetadata");

  const metadataSource = route.slice(metadataStart, pageStart);

  const aliasGuard = metadataSource.indexOf(
    "if (isAliasSite(resolved.siteSlug))"
  );

  const redirect = metadataSource.indexOf(
    "permanentRedirect("
  );

  const siteLoad = metadataSource.indexOf(
    "publicSiteApi.getSite(resolved.siteSlug)"
  );

  assert.ok(aliasGuard >= 0, "metadata must guard legacy site aliases");
  assert.ok(redirect > aliasGuard, "metadata alias guard must redirect");
  assert.ok(siteLoad >= 0, "metadata site load must exist");
  assert.ok(
    redirect < siteLoad,
    "legacy Melun metadata redirect must occur before database-backed site loading"
  );
});
