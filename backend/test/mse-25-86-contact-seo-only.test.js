"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TARGETS,
  buildTargetPlan,
  projectionForPlan,
  homeSeo,
  servicesSeo,
  contactSeo,
  homeBodySentence,
  servicesBodySentence,
} = require("../scripts/mse-25-86-seo-coverage-remediation");

function page(slug, seo, body = null) {
  const blocks = [
    {
      id: `hero-${slug}`,
      blockType: "hero",
      content: { h1: seo.h1, subtitle: "Présentation existante conservée" },
    },
  ];
  if (body) {
    blocks.push({ id: `text-${slug}`, blockType: "text", content: { text: body } });
  }
  return {
    id: `page-${slug}`,
    slug,
    seoTitle: seo.seoTitle,
    metaDescription: seo.metaDescription,
    blocks,
  };
}

test("hero-only contact is accepted when SEO title/meta/H1 alone make appointment strong", () => {
  const target = TARGETS.find((item) => item.city === "Ozoir la Ferrière");
  const city = target.city;
  const site = {
    id: "site-ozoir",
    slug: "ozoir-la-ferriere",
    agency: { city },
    pages: [
      page("home", homeSeo(city), homeBodySentence(city)),
      page("services", servicesSeo(city), servicesBodySentence(city)),
      page("contact", contactSeo(city)),
    ],
  };

  const plan = buildTargetPlan([site], target);
  const projection = projectionForPlan(plan);

  assert.equal(projection.contactBodyEnrichment, false);
  assert.equal(projection.after.appointment.status, "strong");
  assert.ok(projection.after.appointment.score >= 80);
  assert.equal(projection.allRequiredStrong, true);
  assert.equal(site.pages.find((item) => item.slug === "contact").blocks.length, 1);
});
