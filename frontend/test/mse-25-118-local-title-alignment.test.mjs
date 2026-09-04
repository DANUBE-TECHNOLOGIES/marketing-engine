import assert from "node:assert/strict";
import test from "node:test";

import { buildLocalPageSeo } from "../lib/seo/local-page-seo.js";

const daxSite = {
  name: "Mondescale Voyages Dax",
  agency: { city: "Dax" },
};

test("home title aligns with observed agence de voyage + city intent", () => {
  const seo = buildLocalPageSeo({
    site: daxSite,
    page: { title: "Accueil" },
    pageSlug: "",
  });

  assert.equal(seo.title, "Agence de voyage à Dax | Mondescale");
  assert.equal(seo.heading, "Agence de voyages à Dax");
});

test("local page SEO still falls back safely when city is unavailable", () => {
  const seo = buildLocalPageSeo({
    site: { name: "Mondescale Voyages" },
    page: { title: "Accueil" },
    pageSlug: "",
  });

  assert.equal(seo.title, "Accueil | Mondescale");
  assert.equal(seo.heading, "Accueil");
});
