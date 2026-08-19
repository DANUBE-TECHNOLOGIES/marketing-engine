"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertPartnerPagePublishable } = require("../src/modules/agency-site/page-builder-save");

function completeBlocks() {
  return [
    { sectionType: "page-header", jsonContent: { __builderType: "page-header", title: "Nos partenaires de voyage à Gien" } },
    { sectionType: "partners-introduction", jsonContent: { __builderType: "partners-introduction", text: "Introduction locale" } },
    { sectionType: "partner-directory", jsonContent: { __builderType: "partner-directory" } },
    { sectionType: "contact-cta", jsonContent: { __builderType: "contact-cta" } },
  ];
}

test("partner draft remains editable even when structurally incomplete", () => {
  assert.equal(assertPartnerPagePublishable({
    slug: "partenaires",
    status: "draft",
    title: "Nos partenaires",
    seoTitle: "",
    metaDescription: "",
    h1: "",
    blocks: [],
  }), null);
});

test("partner publication is rejected when a required section is missing", () => {
  assert.throws(() => assertPartnerPagePublishable({
    slug: "partenaires",
    status: "published",
    title: "Nos partenaires",
    seoTitle: "Partenaires voyage à Gien | Ambassade FRAM - Mondescale Gien",
    metaDescription: "Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par votre agence de voyages à Gien pour construire votre prochain voyage.",
    h1: "Nos partenaires de voyage à Gien",
    blocks: completeBlocks().filter((block) => block.sectionType !== "partner-directory"),
  }), (error) => {
    assert.equal(error.code, "PARTNER_PAGE_PUBLICATION_NOT_READY");
    assert.equal(error.statusCode, 409);
    assert.equal(error.details.ready, false);
    assert.ok(error.details.missingSections.includes("partner-directory"));
    return true;
  });
});

test("partner publication is accepted when the final page contract is complete", () => {
  const readiness = assertPartnerPagePublishable({
    slug: "/partenaires/",
    status: "published",
    title: "Nos partenaires",
    seoTitle: "Partenaires voyage à Gien | Ambassade FRAM - Mondescale Gien",
    metaDescription: "Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par votre agence de voyages à Gien pour construire votre prochain voyage.",
    h1: "Nos partenaires de voyage à Gien",
    blocks: completeBlocks(),
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.blockingCount, 0);
});
