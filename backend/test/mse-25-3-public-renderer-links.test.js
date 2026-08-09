"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function source(relativePath) {
  return fs.readFileSync(
    path.resolve(__dirname, "../../frontend", relativePath),
    "utf8"
  );
}

test(
  "MSE-25.3 garde les liens du chrome public sur /agence",
  () => {
    const header = source(
      "components/public-site/PublicSiteHeader.js"
    );
    const footer = source(
      "components/public-site/PublicSiteFooter.js"
    );

    for (const file of [header, footer]) {
      assert.match(file, /\/agence\//);
      assert.doesNotMatch(file, /\/sites\//);
    }
  }
);


test(
  "MSE-25.3 garde les CTA offres sur /agence",
  () => {
    const offers = source(
      "components/public-site/renderers/OffersRenderer.js"
    );

    assert.match(
      offers,
      /resolvePublicCtaHref\([\s\S]*?site,[\s\S]*?item\.href,[\s\S]*?["']contact["'][\s\S]*?\)/
    );

    assert.doesNotMatch(
      offers,
      /\/sites\//
    );
  }
);

test(
  "MSE-25.3 garde les CTA du renderer commun sur le chemin canonique",
  () => {
    const sections = source(
      "components/public-site/PublicSiteSections.js"
    );

    assert.match(
      sections,
      /const root = `\/agence\/\$\{encodeURIComponent\(site\.slug\)\}`/
    );

    assert.match(
      sections,
      /publicPageHref\(site, ["']contact["']\)/
    );
  }
);

test(
  "MSE-25.3 relie les cartes destination aux pages publiques existantes",
  () => {
    const destinations = source(
      "components/public-site/renderers/DestinationsRenderer.js"
    );

    assert.match(
      destinations,
      /`\/agence\/\$\{encodeURIComponent\(site\.slug\)\}`/
    );

    assert.match(
      destinations,
      /`\/destination\/\$\{encodeURIComponent\(item\.slug\)\}`/
    );

    assert.doesNotMatch(
      destinations,
      /\/sites\//
    );
  }
);
