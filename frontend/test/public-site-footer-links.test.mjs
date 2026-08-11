import test from "node:test";
import assert from "node:assert/strict";

import {
  publishedNavigationSlugs,
} from "../components/public-site/PublicSiteFooter.js";

test("footer derives optional links from published navigation", () => {
  const site = {
    navigation: [
      { slug: "services", title: "Services" },
      { slug: "contact", title: "Contact" },
      { slug: "avis", title: "Avis clients" },
    ],
  };

  const slugs = publishedNavigationSlugs(site);
  assert.equal(slugs.has("avis"), true);
  assert.equal(slugs.has("equipe"), false);
});

test("footer does not assume optional pages exist", () => {
  const site = {
    navigation: [
      { slug: "services", title: "Services" },
      { slug: "contact", title: "Contact" },
    ],
  };

  const slugs = publishedNavigationSlugs(site);
  assert.equal(slugs.has("avis"), false);
});
