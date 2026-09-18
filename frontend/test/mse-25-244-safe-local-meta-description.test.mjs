import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocalPageSeo,
  MAX_DESCRIPTION_LENGTH,
} from "../lib/seo/local-page-seo.js";

const site = {
  name: "Mondescale",
  city: "Ozoir la Ferrière",
  agency: {
    city: "Ozoir la Ferrière",
  },
  targetCities: [
    "Pontault-Combault",
    "Roissy-en-Brie",
    "Gretz-Armainvilliers",
    "Tournan-en-Brie",
  ],
};

test("MSE-25.244 never truncates a local-area sentence halfway", () => {
  const seo = buildLocalPageSeo({
    site,
    page: {
      slug: "home",
      title: "Accueil",
    },
    pageSlug: "home",
  });

  assert.ok(seo.description);
  assert.ok(seo.description.length <= MAX_DESCRIPTION_LENGTH);

  assert.doesNotMatch(
    seo.description,
    /Nous accompagnons aussi les\.$/
  );

  assert.doesNotMatch(
    seo.description,
    /Nous accompagnons aussi les voyageurs de\s*\.$/
  );
});

test("MSE-25.244 produces a complete sentence", () => {
  const seo = buildLocalPageSeo({
    site,
    page: {
      slug: "home",
      title: "Accueil",
    },
    pageSlug: "home",
  });

  assert.match(seo.description, /\.$/);
});
