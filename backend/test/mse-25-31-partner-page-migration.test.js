"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LEGACY_SECTION,
  TARGET_SECTION,
  applyPartnerPageMigration,
  migrationPreviewForPage,
  migratedDirectoryContent,
  targetPageFields,
} = require("../src/modules/agency-site/partner-page-migration");

function legacyPage(overrides = {}) {
  const agency = { id: 4, name: "Ambassade FRAM - Mondescale Gien", city: "Gien" };
  return {
    id: "page-1",
    siteId: "site-1",
    title: "Nos partenaires",
    slug: "partenaires",
    path: "/agence/gien/partenaires",
    status: "published",
    published: true,
    seoTitle: "Partenaires voyage à Gien | Ambassade FRAM - Mondescale Gien",
    metaDescription: "Découvrez les partenaires sélectionnés par Ambassade FRAM - Mondescale Gien pour proposer des voyages fiables et adaptés à chaque projet.",
    h1: "Nos partenaires",
    site: { id: "site-1", agencyId: 4, slug: "gien", name: agency.name, agency },
    sections: [
      { id: "s1", pageId: "page-1", sectionType: "page-header", displayOrder: 10, status: "draft", jsonContent: { title: "Nos partenaires" } },
      { id: "s2", pageId: "page-1", sectionType: "partners-introduction", displayOrder: 20, status: "draft", jsonContent: { title: "Introduction" } },
      { id: "s3", pageId: "page-1", sectionType: LEGACY_SECTION, displayOrder: 30, status: "draft", jsonContent: { city: "Gien", agencyId: 4, agencyName: agency.name, items: ["Tour-opérateurs généralistes"], title: "Nos familles de partenaires", contact: { phone: "0102030405" }, sitePath: "/agence/gien" } },
      { id: "s4", pageId: "page-1", sectionType: "contact-cta", displayOrder: 40, status: "draft", jsonContent: { title: "Contact" } },
    ],
    ...overrides,
  };
}

test("legacy partner page preview becomes ready without changing publication state", () => {
  const preview = migrationPreviewForPage(legacyPage());
  assert.equal(preview.state, "eligible");
  assert.equal(preview.currentPublished, true);
  assert.equal(preview.preservesPublicationState, true);
  assert.equal(preview.targetH1, "Nos partenaires de voyage à Gien");
  assert.equal(preview.readinessBefore.ready, false);
  assert.equal(preview.readinessAfter.ready, true);
  assert.deepEqual(preview.readinessAfter.missingSections, []);
});

test("migration preserves manual H1 and manual meta description", () => {
  const page = legacyPage({
    h1: "Les partenaires choisis par notre équipe",
    metaDescription: "Une description manuelle propre à cette agence et suffisamment explicite pour être préservée pendant la migration.",
  });
  const fields = targetPageFields(page, page.site.agency);
  assert.equal(fields.h1, page.h1);
  assert.equal(fields.metaDescription, page.metaDescription);
});

test("directory migration removes legacy category list but preserves operational metadata", () => {
  const section = legacyPage().sections[2];
  const content = migratedDirectoryContent(section, legacyPage().site.agency);
  assert.equal(content.items, undefined);
  assert.equal(content.title, "Tous nos partenaires voyage");
  assert.equal(content.agencyId, 4);
  assert.equal(content.contact.phone, "0102030405");
  assert.equal(content.__builderType, TARGET_SECTION);
});

test("migration refuses apply without explicit confirmation", async () => {
  await assert.rejects(
    () => applyPartnerPageMigration({ prisma: {}, tenantId: "tenant-1", input: {} }),
    (error) => error.code === "PARTNER_PAGE_MIGRATION_CONFIRMATION_REQUIRED"
  );
});

test("migration snapshots first and preserves published status while replacing only canonical sections", async () => {
  const page = legacyPage();
  const operations = [];
  let version = 4;
  const tx = {
    agencySitePageVersion: {
      aggregate: async () => ({ _max: { version } }),
      create: async ({ data }) => {
        operations.push(["snapshot", data]);
        version = data.version;
        return { id: `v-${version}`, ...data };
      },
    },
    agencySitePage: {
      update: async ({ data }) => { operations.push(["page-update", data]); },
    },
    agencySiteSection: {
      deleteMany: async () => { operations.push(["sections-delete"]); },
      createMany: async ({ data }) => { operations.push(["sections-create", data]); },
    },
  };
  const prisma = {
    agencySitePage: {
      findMany: async () => [page],
    },
    $transaction: async (fn) => fn(tx),
  };

  const result = await applyPartnerPageMigration({
    prisma,
    tenantId: "tenant-1",
    input: { confirmed: true, createdBy: "test" },
  });

  assert.equal(result.migrated, 1);
  assert.equal(operations[0][0], "snapshot");
  const pageUpdate = operations.find(([name]) => name === "page-update")[1];
  assert.equal(pageUpdate.status, "published");
  assert.equal(pageUpdate.published, true);
  assert.equal(pageUpdate.h1, "Nos partenaires de voyage à Gien");
  const created = operations.find(([name]) => name === "sections-create")[1];
  assert.deepEqual(created.map((section) => section.sectionType), [
    "page-header",
    "partners-introduction",
    "partner-directory",
    "contact-cta",
  ]);
});

test("already migrated page is idempotently skipped", () => {
  const page = legacyPage({
    sections: legacyPage().sections.map((section) =>
      section.sectionType === LEGACY_SECTION
        ? { ...section, sectionType: TARGET_SECTION }
        : section
    ),
  });
  const preview = migrationPreviewForPage(page);
  assert.equal(preview.state, "already-migrated");
});
