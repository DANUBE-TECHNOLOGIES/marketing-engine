import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/[contentSlug]/page.js", import.meta.url),
  "utf8"
);

const article = await readFile(
  new URL("../components/public-site/InspirationArticle.js", import.meta.url),
  "utf8"
);

test("article canonical is absolute and shared with OpenGraph", () => {
  assert.match(page, /const canonical = `\$\{PUBLIC_ORIGIN\}/);
  assert.match(page, /alternates:\s*\{[\s\S]*canonical/);
  assert.match(page, /url: canonical/);
});

test("article schema exposes real publication and modification dates when available", () => {
  assert.match(page, /datePublished/);
  assert.match(page, /dateModified/);
  assert.match(page, /publishedAt/);
  assert.match(page, /updatedAt/);
});

test("article schema links author and publisher to the canonical agency", () => {
  assert.match(page, /"@type": "Organization"/);
  assert.match(page, /"@type": "TravelAgency"/);
  assert.match(page, /#travel-agency/);
  assert.match(page, /buildTravelAgencySchema/);
  assert.match(page, /buildBreadcrumbSchema/);
});

test("canonical inspiration metadata contains an agency-local signal", () => {
  assert.match(page, /function localCity/);
  assert.match(page, /depuis \$\{city\}/);
  assert.match(page, /Conseils de votre agence Mondescale à \$\{city\}/);
  assert.match(page, /max-image-preview/);
  assert.match(page, /twitter:/);
});

test("inspiration article strengthens local internal linking", () => {
  assert.match(article, /Cette inspiration est sélectionnée par votre agence Mondescale à/);
  assert.match(article, /\/destinations/);
  assert.match(article, /\/services/);
  assert.match(article, /\/inspiration/);
  assert.match(article, /\/contact/);
});
