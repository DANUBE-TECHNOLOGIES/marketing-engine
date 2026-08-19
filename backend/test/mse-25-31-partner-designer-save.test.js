"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeDesignerBlocks,
  primaryHeading,
  saveDesignerPage,
} = require("../src/modules/agency-site/page-builder-save");

function fakePrisma() {
  const state = {
    versions: [],
    page: {
      id: "page-partners",
      siteId: "site-gien",
      title: "Nos partenaires",
      slug: "partenaires",
      path: "/agence/gien/partenaires",
      pageType: "PARTNERS",
      menuTitle: "Nos partenaires",
      menuLocation: "secondary",
      displayOrder: 40,
      seoTitle: "Partenaires voyage à Gien | Mondescale Gien",
      metaDescription: "Description initiale",
      h1: "Nos partenaires de voyage à Gien",
      status: "draft",
      published: false,
      sections: [],
      blocks: [],
      site: { id: "site-gien", agencyId: 1, tenantId: "tenant-1", basePath: "/agence/gien" },
    },
  };

  const agencySitePage = {
    async findFirst() { return structuredClone(state.page); },
    async update({ data }) {
      Object.assign(state.page, data);
      return structuredClone(state.page);
    },
    async findUnique() { return structuredClone(state.page); },
  };
  const agencySiteSection = {
    async deleteMany() { state.page.sections = []; return { count: 0 }; },
    async createMany({ data }) {
      state.page.sections = data.map((item, index) => ({ id: `section-${index}`, ...structuredClone(item) }));
      return { count: data.length };
    },
  };
  const agencySitePageVersion = {
    async aggregate() {
      return { _max: { version: state.versions.reduce((max, item) => Math.max(max, item.version), 0) || null } };
    },
    async create({ data }) {
      const version = { id: `version-${state.versions.length + 1}`, ...structuredClone(data) };
      state.versions.push(version);
      return structuredClone(version);
    },
  };

  return {
    state,
    agencySitePage,
    agencySiteSection,
    agencySitePageVersion,
    async $transaction(callback) {
      return callback({ agencySitePage, agencySiteSection, agencySitePageVersion });
    },
  };
}

function partnerBlocks() {
  return [
    { type: "page-header", status: "draft", position: 0, content: { title: "Nos partenaires de voyage à Gien", introduction: "Introduction" } },
    { type: "partners-introduction", status: "draft", position: 1, content: { title: "Des partenaires sélectionnés", text: "Texte" } },
    { type: "partner-directory", status: "draft", position: 2, content: { title: "Tous nos partenaires voyage" } },
    { type: "contact-cta", status: "draft", position: 3, content: { title: "Parlons de votre prochain voyage", text: "Contactez-nous" } },
  ];
}

test("designer save keeps partner page private while status is draft", async () => {
  const prisma = fakePrisma();
  const result = await saveDesignerPage({
    prisma,
    tenantId: "tenant-1",
    agencyId: 1,
    slug: "partenaires",
    input: {
      page: {
        slug: "partenaires",
        title: "Nos partenaires",
        status: "draft",
        published: true,
        seoTitle: "Partenaires voyage à Gien | Mondescale Gien",
        seoDescription: "Nouvelle description locale de la page partenaires.",
      },
      blocks: partnerBlocks(),
    },
  });

  assert.equal(result.page.status, "draft");
  assert.equal(result.page.published, false);
  assert.equal(result.publication.publicEligible, false);
  assert.equal(result.page.h1, "Nos partenaires de voyage à Gien");
  assert.equal(result.page.metaDescription, "Nouvelle description locale de la page partenaires.");
  assert.equal(prisma.state.versions.length, 1);
  assert.deepEqual(result.page.sections.map((section) => section.sectionType), [
    "page-header", "partners-introduction", "partner-directory", "contact-cta",
  ]);
});

test("designer save publishes partner page only on explicit published status", async () => {
  const prisma = fakePrisma();
  const result = await saveDesignerPage({
    prisma,
    tenantId: "tenant-1",
    agencyId: 1,
    slug: "partenaires",
    input: {
      page: { slug: "partenaires", title: "Nos partenaires", status: "published" },
      blocks: partnerBlocks(),
    },
  });

  assert.equal(result.page.status, "published");
  assert.equal(result.page.published, true);
  assert.equal(result.publication.publicEligible, true);
  assert.equal(prisma.state.versions.length, 1);
});

test("designer save rejects silent slug mutation", async () => {
  const prisma = fakePrisma();
  await assert.rejects(
    () => saveDesignerPage({
      prisma,
      tenantId: "tenant-1",
      agencyId: 1,
      slug: "partenaires",
      input: { page: { slug: "partenaires-2", title: "Nos partenaires", status: "draft" }, blocks: partnerBlocks() },
    }),
    (error) => error?.code === "AGENCY_SITE_PAGE_SLUG_CHANGE_REQUIRES_DEDICATED_ACTION"
  );
});

test("designer block normalization preserves generated partner page types and H1", () => {
  const blocks = normalizeDesignerBlocks(partnerBlocks());
  assert.equal(primaryHeading(blocks), "Nos partenaires de voyage à Gien");
  assert.deepEqual(blocks.map((block) => block.sectionType), [
    "page-header", "partners-introduction", "partner-directory", "contact-cta",
  ]);
});