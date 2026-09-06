import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  new URL(
    "../app/agence/[siteSlug]/inspiration/page.js",
    import.meta.url
  ),
  "utf8"
);

test("MSE-25.125AL inspiration metadata loads CMS page", () => {
  assert.match(
    route,
    /publicSiteApi\.getPage\(siteSlug,\s*"inspirations"\)/
  );

  assert.match(
    route,
    /inspirationSeo\(site,\s*inspirationPage\)/
  );

  assert.match(
    route,
    /function inspirationSeo\(site,\s*page = null\)/
  );

  assert.match(
    route,
    /page:\s*page\s*\|\|\s*\{/
  );
});

test("MSE-25.125AL keeps generated SEO fallback", () => {
  assert.match(
    route,
    /slug:\s*"inspiration"/
  );

  assert.match(
    route,
    /title:\s*"Inspirations voyage"/
  );

  assert.match(
    route,
    /pageSlug:\s*"inspiration"/
  );
});

test("MSE-25.125AL preserves conditional indexing", () => {
  assert.match(
    route,
    /index:\s*hasPublicInspirations/
  );

  assert.match(
    route,
    /follow:\s*true/
  );
});

test("MSE-25.125AL aligns rendered WebPage SEO with CMS page", () => {
  const pageLoads = route.match(
    /publicSiteApi\.getPage\(siteSlug,\s*"inspirations"\)/g
  ) || [];

  assert.equal(pageLoads.length, 2);

  const cmsSeoCalls = route.match(
    /inspirationSeo\(site,\s*inspirationPage\)/g
  ) || [];

  assert.equal(cmsSeoCalls.length, 2);

  assert.match(
    route,
    /title:\s*seo\.title/
  );

  assert.match(
    route,
    /description:\s*seo\.description/
  );
});

test("MSE-25.125AL keeps inspirationPage in render scope", () => {
  assert.match(
    route,
    /let inspirationPage\s*=\s*null\s*;/
  );

  assert.match(
    route,
    /inspirationPage\s*=\s*loaded\[1\]\s*;/
  );

  assert.doesNotMatch(
    route,
    /const inspirationPage\s*=\s*loaded\[1\]\s*;/
  );
});
