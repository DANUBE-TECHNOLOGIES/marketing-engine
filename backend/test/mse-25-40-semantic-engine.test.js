"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { semanticPlan, networkSemanticPlan } = require("../src/modules/minisite-semantic-engine/engine");

function page(slug, title, body = "") {
  return {
    id: `page-${slug}`,
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Conseils personnalisés.`,
    published: true,
    blocks: [
      { id: `hero-${slug}`, blockType: "hero", content: { title } },
      { id: `copy-${slug}`, blockType: "rich_text", content: { html: `<p>${body}</p>` } },
    ],
  };
}

function site() {
  return {
    id: "site-gien",
    slug: "ambassade-fram-mondescale-gien",
    status: "published",
    agencyId: 4,
    agency: { id: 4, name: "Mondescale Gien", city: "Gien" },
    pages: [
      page("home", "Agence de voyages à Gien", "Conseil voyage et accompagnement."),
      page("services", "Services de votre agence à Gien", "Billetterie, vols, croisières, circuits, séjours et voyages sur mesure."),
      page("avis", "Avis clients à Gien", "Retours de nos voyageurs."),
    ],
  };
}

test("semantic plan is deterministic, read-only and forbids doorway expansion", () => {
  const first = semanticPlan(site());
  const second = semanticPlan(site());
  assert.equal(first.planFingerprint, second.planFingerprint);
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
  assert.equal(first.destructive, false);
  assert.equal(first.policy.doorwayGuard, true);
  assert.equal(first.policy.locationExpansion, false);
  assert.equal(first.policy.autoCreatePages, false);
  assert.deepEqual(first.policy.allowedLocationScope, ["Gien"]);
  assert.doesNotMatch(JSON.stringify(first), /Montargis|Orléans|Briare/i);
});

test("semantic plan distinguishes dedicated coverage from incidental mentions", () => {
  const result = semanticPlan(site());
  const agency = result.coverage.find((row) => row.intentKey === "agency");
  const reviews = result.coverage.find((row) => row.intentKey === "reviews");
  const ticketing = result.coverage.find((row) => row.intentKey === "ticketing");
  assert.equal(agency.status, "strong");
  assert.equal(reviews.status, "strong");
  assert.equal(ticketing.status, "gap");
  assert.equal(ticketing.bestPageSlug, "services");
  assert.ok(ticketing.bestScore > 0);
  const opportunity = result.opportunities.find((row) => row.intentKey === "ticketing");
  assert.equal(opportunity.type, "strengthen-existing-page");
  assert.equal(opportunity.pageSlug, "services");
  assert.equal(opportunity.autoCreate, false);
  assert.equal(result.summary.blockingConflictCount, 0);
});

test("missing commercial intent is review-only and never auto-created", () => {
  const input = site();
  input.pages = input.pages.filter((item) => item.slug !== "services");
  const result = semanticPlan(input);
  const gap = result.opportunities.find((row) => row.intentKey === "cruise");
  assert.ok(gap);
  assert.equal(gap.type, "page-candidate-review");
  assert.equal(gap.autoCreate, false);
  assert.equal(gap.requiresHumanReview, true);
  assert.equal(gap.locationScope, "Gien");
});

test("cannibalization is advisory and never blocks rollout by itself", () => {
  const input = site();
  input.pages.push(page("agence", "Votre agence de voyages à Gien", "Agence locale et conseil voyage."));
  const result = semanticPlan(input);
  const agencyConflict = result.cannibalization.find((row) => row.intentKey === "agency");
  assert.ok(agencyConflict);
  assert.equal(agencyConflict.blocking, false);
  assert.equal(result.summary.blockingConflictCount, 0);
});

test("network preview excludes draft mini-sites", () => {
  const published = site();
  const draft = { ...site(), id: "site-draft", slug: "tui-store-amilly", status: "draft", publishedAt: null, agencyId: 9 };
  const result = networkSemanticPlan([published, draft]);
  assert.equal(result.summary.agenciesProcessed, 1);
  assert.equal(result.summary.agenciesExcluded, 1);
  assert.equal(result.excludedSites[0].siteSlug, "tui-store-amilly");
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
});
