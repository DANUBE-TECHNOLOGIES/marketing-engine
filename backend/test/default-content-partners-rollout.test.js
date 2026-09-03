"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DefaultContentAdapter, normalizePageType } = require("../src/modules/content-engine/default-content/adapter");

const adapter = new DefaultContentAdapter();

const agency = {
  id: 6,
  name: "Ambassade FRAM - Mondescale Bois-Colombes",
  city: "Bois-Colombes",
};

const site = {
  id: "site-6",
  slug: "ambassade-fram-mondescale-bois-colombes",
};

test("la page partenaires existante conserve le contenu historique et ajoute seulement l'annuaire manquant", () => {
  const page = {
    id: "page-partners",
    slug: "partenaires",
    pageType: "PARTNERS",
    sections: [
      {
        id: "existing-header",
        sectionType: "page-header",
        content: { title: "Nos partenaires" },
      },
      {
        id: "legacy-logos",
        sectionType: "logos",
        content: { items: [{ name: "FRAM" }] },
      },
    ],
  };

  const plan = adapter.buildPlan({
    agency,
    site,
    page,
    existingSections: page.sections,
    allowGeneratedRefresh: false,
  });

  assert.equal(plan.page.pageType, "PARTNERS");

  const byType = Object.fromEntries(
    plan.operations.map((operation) => [operation.sectionType, operation])
  );

  assert.equal(byType["page-header"].action, "preserve");
  assert.equal(byType["partner-directory"].action, "create");
  assert.equal(byType["contact-cta"].action, "create");

  assert.equal(
    plan.operations.some((operation) => operation.sectionType === "logos"),
    false
  );
  assert.equal(
    plan.operations.some((operation) => operation.action === "refresh"),
    false
  );
});

test("un annuaire déjà présent est préservé et n'est jamais recréé", () => {
  const page = {
    id: "page-partners",
    slug: "partenaires",
    sections: [
      {
        id: "existing-directory",
        sectionType: "partner-directory",
        content: {
          title: "Annuaire édité manuellement",
          meta: { source: "human" },
        },
      },
    ],
  };

  const plan = adapter.buildPlan({
    agency,
    site,
    page,
    existingSections: page.sections,
    allowGeneratedRefresh: false,
  });

  const directory = plan.operations.find(
    (operation) => operation.sectionType === "partner-directory"
  );

  assert.ok(directory);
  assert.equal(directory.action, "preserve");
  assert.equal(directory.generatedSection, null);
});

test("le slug partenaires reste reconnu même sans pageType explicite", () => {
  assert.equal(normalizePageType({ slug: "partenaires" }), "PARTENAIRES");

  const plan = adapter.buildPlan({
    agency,
    site,
    page: {
      id: "page-partners",
      slug: "partenaires",
      sections: [],
    },
  });

  assert.equal(plan.summary.create, 3);
  assert.equal(
    plan.operations.some((operation) => operation.sectionType === "partner-directory"),
    true
  );
});
