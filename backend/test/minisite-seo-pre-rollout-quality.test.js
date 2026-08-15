"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { preRolloutQualityReport } = require("../src/modules/minisite-seo-enrichment/pre-rollout-quality");
const { MiniSiteSeoEnrichmentService } = require("../src/modules/minisite-seo-enrichment/service");

function page(slug, blocks, published = true) {
  return { slug, title: slug, published, optimizedBlocks: blocks };
}

function textBlock(text) {
  return { type: "rich_text", content: { title: "Conseils voyage", text } };
}

const longCopy = "Notre équipe vous accompagne pour comparer les solutions, organiser les étapes de votre voyage et préparer un projet cohérent avec vos envies, vos dates et votre budget. ".repeat(10);

test("MSE-25.30 pre-rollout gate detects orphan published pages", () => {
  const plans = [{
    agencyId: 1,
    siteSlug: "gien",
    pages: [
      page("home", [textBlock(longCopy), { type: "cta", content: { primaryCta: { label: "Contact", href: "/agence/gien/contact" } } }]),
      page("circuits", [textBlock(longCopy), { type: "cta", content: { primaryCta: { label: "Contact", href: "/agence/gien/contact" }, secondaryCta: { label: "Croisières", href: "/agence/gien/croisieres" } } }]),
      page("croisieres", [textBlock(longCopy), { type: "cta", content: { primaryCta: { label: "Contact", href: "/agence/gien/contact" }, secondaryCta: { label: "Circuits", href: "/agence/gien/circuits" } } }]),
      page("contact", [textBlock(longCopy)]),
    ],
  }];
  const report = preRolloutQualityReport(plans, { minimumWords: 120 });
  assert.equal(report.blocked, true);
  assert.ok(report.blocking.some((issue) => issue.code === "ORPHAN_PAGE"));
});

test("MSE-25.30 pre-rollout gate warns on thin content and missing editorial image alt", () => {
  const plans = [{
    agencyId: 1,
    siteSlug: "gien",
    pages: [page("home", [
      textBlock("Contenu court"),
      { type: "image_text", content: { imageUrl: "https://example.test/sicile.jpg", text: "La Sicile" } },
    ])],
  }];
  const report = preRolloutQualityReport(plans, { minimumWords: 120 });
  assert.ok(report.warnings.some((issue) => issue.code === "THIN_CONTENT"));
  assert.ok(report.warnings.some((issue) => issue.code === "IMAGE_ALT_MISSING"));
});

test("MSE-25.30 commercial pages without a contact path block rollout", () => {
  const plans = [{ agencyId: 1, siteSlug: "gien", pages: [page("circuits", [textBlock(longCopy)])] }];
  const report = preRolloutQualityReport(plans, { minimumWords: 120 });
  assert.ok(report.blocking.some((issue) => issue.code === "COMMERCIAL_CONTACT_LINK_MISSING"));
});

test("MSE-25.30 network rollout refuses writes on blocking quality issues", async () => {
  const service = new MiniSiteSeoEnrichmentService({ repository: {} });
  service.buildNetworkContentOptimization = async () => ({
    similarity: { blocked: false, conflictCount: 0 },
    quality: { blocked: true, blockingCount: 1, warningCount: 0, blocking: [{ code: "ORPHAN_PAGE" }] },
    summary: { rolloutBlocked: true },
    plans: [],
  });

  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: true }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, "MINISITE_SEO_NETWORK_QUALITY_BLOCKED");
      assert.equal(error.details.blockingCount, 1);
      return true;
    }
  );
});
