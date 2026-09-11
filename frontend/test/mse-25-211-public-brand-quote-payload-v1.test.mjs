import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const businessSource = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/business-travel/page.js", import.meta.url),
  "utf8"
);

const quoteSource = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/demande-devis/page.js", import.meta.url),
  "utf8"
);

const smartQuoteSource = fs.readFileSync(
  new URL("../components/public-site/SmartQuoteRequest.js", import.meta.url),
  "utf8"
);

test("business-travel utilise l'identité configurée de l'agence dans les metadata", () => {
  assert.match(businessSource, /function agencyName\(site\)/);
  assert.match(businessSource, /site\?\.name/);
  assert.match(businessSource, /`Voyages d’affaires à \$\{city\} \| \$\{agency\}`/);
  assert.match(businessSource, /siteName: agency/);

  assert.doesNotMatch(
    businessSource,
    /Voyages d’affaires à \$\{city\} \| Mondescale/
  );
  assert.doesNotMatch(
    businessSource,
    /coordonnées de l’agence Mondescale/
  );
});

test("business-travel reste générique seulement si aucun nom d'agence n'est disponible", () => {
  assert.match(
    businessSource,
    /return city \? `Agence de voyages à \$\{city\}` : "Agence de voyages"/
  );
});

test("demande-devis construit un payload client compact", () => {
  assert.match(quoteSource, /function compactQuoteSite\(site, fallbackSlug = ""\)/);
  assert.match(quoteSource, /const quoteSite = compactQuoteSite\(site, siteSlug\)/);
  assert.match(quoteSource, /<SmartQuoteRequest site=\{quoteSite\} source=\{source\} \/>/);
  assert.doesNotMatch(quoteSource, /<SmartQuoteRequest site=\{site\}/);

  const compactFunction = quoteSource.match(
    /function compactQuoteSite\([\s\S]*?\n}\n/
  )?.[0] || "";

  assert.match(compactFunction, /slug:/);
  assert.match(compactFunction, /city:/);
  assert.doesNotMatch(compactFunction, /legal/);
  assert.doesNotMatch(compactFunction, /legalProfile/);
  assert.doesNotMatch(compactFunction, /navigation/);
  assert.doesNotMatch(compactFunction, /pages/);
  assert.doesNotMatch(compactFunction, /brand/);
});

test("SmartQuoteRequest n'utilise que slug et city du site public", () => {
  const sitePropertyMatches = [
    ...smartQuoteSource.matchAll(/site\?\.([A-Za-z0-9_]+)/g),
  ].map((match) => match[1]);

  assert.deepEqual(
    [...new Set(sitePropertyMatches)].sort(),
    ["city", "slug"]
  );
});
