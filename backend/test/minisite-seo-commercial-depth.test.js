"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  optimizePageContent,
  buildCommercialFaq,
  relatedCommercialPage,
} = require("../src/modules/minisite-seo-enrichment/content-optimizer");
const { validatePagePayload } = require("../src/modules/page-builder-persistence/validation");

const agency = { name: "Mondescale Gien", city: "Gien" };
const availablePages = [
  { slug: "croisieres", title: "Croisières" },
  { slug: "circuits", title: "Circuits" },
  { slug: "voyages-sur-mesure", title: "Voyages sur mesure" },
  { slug: "sejours", title: "Séjours" },
  { slug: "billetterie-vols", title: "Billetterie et vols" },
];

test("MSE-25.30 generates a local commercial FAQ that varies by intent", () => {
  const cruiseFaq = buildCommercialFaq({ agency, page: availablePages[0] });
  const circuitFaq = buildCommercialFaq({ agency, page: availablePages[1] });

  assert.equal(cruiseFaq.length, 3);
  assert.equal(circuitFaq.length, 3);
  assert.match(cruiseFaq[0].question, /croisière/i);
  assert.match(cruiseFaq[0].question, /Gien/);
  assert.match(circuitFaq[0].question, /circuit/i);
  assert.notEqual(cruiseFaq[0].question, circuitFaq[0].question);
});

test("MSE-25.30 links each commercial page to another existing commercial page", () => {
  const related = relatedCommercialPage(availablePages[0], availablePages);
  assert.ok(related);
  assert.equal(related.href, "circuits");
});

test("MSE-25.30 adds FAQ and a crawlable secondary commercial CTA without duplicating manual blocks", () => {
  const page = { slug: "croisieres", title: "Croisières", status: "published", published: true };
  const result = optimizePageContent({
    agency,
    page,
    siteSlug: "gien",
    availablePages,
    blocks: [
      {
        type: "hero",
        status: "published",
        position: 0,
        content: {
          eyebrow: "",
          title: "Croisières",
          subtitle: "Introduction manuelle",
          imageAssetId: "",
          imageUrl: null,
          imageAlt: "",
          primaryCta: { label: "Demander un devis", href: "#contact" },
          secondaryCta: null,
          alignment: "left",
        },
      },
    ],
  });

  const faq = result.blocks.find((block) => block.type === "faq");
  const cta = result.blocks.find((block) => block.type === "cta");
  assert.ok(faq);
  assert.equal(faq.status, "published");
  assert.equal(faq.content.items.length, 3);
  assert.match(faq.content.title, /croisières à Gien/i);

  assert.ok(cta);
  assert.equal(cta.status, "published");
  assert.equal(cta.content.primaryCta.href, "/agence/gien/contact");
  assert.equal(cta.content.secondaryCta.href, "/agence/gien/circuits");

  const validated = validatePagePayload({
    page: {
      title: page.title,
      slug: page.slug,
      status: page.status,
      published: page.published,
    },
    blocks: result.blocks,
  });
  assert.ok(validated.blocks.some((block) => block.type === "faq"));
  assert.equal(
    validated.blocks.find((block) => block.type === "cta").content.secondaryCta.href,
    "/agence/gien/circuits"
  );
});

test("MSE-25.30 preserves a manually authored FAQ and CTA", () => {
  const result = optimizePageContent({
    agency,
    page: { slug: "circuits", title: "Circuits", status: "published", published: true },
    siteSlug: "gien",
    availablePages,
    blocks: [
      { type: "hero", status: "published", position: 0, content: { title: "Circuits", subtitle: "Texte manuel" } },
      {
        type: "faq",
        status: "published",
        position: 1,
        content: { title: "FAQ de l'agence", items: [{ question: "Question manuelle ?", answer: "Réponse manuelle." }] },
      },
      {
        type: "cta",
        status: "published",
        position: 2,
        content: {
          title: "CTA manuel",
          text: "Texte manuel",
          primaryCta: { label: "Nous écrire", href: "/agence/gien/contact" },
          secondaryCta: null,
          style: "soft",
        },
      },
    ],
  });

  assert.equal(result.blocks.filter((block) => block.type === "faq").length, 1);
  assert.equal(result.blocks.find((block) => block.type === "faq").content.title, "FAQ de l'agence");
  assert.equal(result.blocks.filter((block) => block.type === "cta").length, 1);
  assert.equal(result.blocks.find((block) => block.type === "cta").content.title, "CTA manuel");
});
