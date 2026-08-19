"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pageSnapshot,
  createNextVersion,
} = require("../src/modules/agency-site/page-builder-save");
const {
  restoredPageData,
  rollbackPageVersion,
} = require("../src/modules/agency-site/page-versions");

test("page snapshot stores canonical metadata and sections", () => {
  const snapshot = pageSnapshot({
    title: "Nos partenaires",
    slug: "partenaires",
    status: "published",
    published: true,
    seoTitle: "Partenaires voyage à Gien",
    metaDescription: "Meta",
    h1: "Nos partenaires de voyage à Gien",
    sections: [{
      sectionType: "partner-directory",
      jsonContent: { title: "Tous nos partenaires voyage" },
      displayOrder: 20,
      status: "draft",
    }],
    blocks: [{ blockType: "legacy" }],
  });

  assert.equal(snapshot.page.status, "published");
  assert.equal(snapshot.page.published, true);
  assert.equal(snapshot.sections.length, 1);
  assert.equal(snapshot.sections[0].sectionType, "partner-directory");
  assert.equal(Object.hasOwn(snapshot, "blocks"), false);
});

test("version numbers increment from the current page history", async () => {
  const created = [];
  const tx = {
    agencySitePageVersion: {
      async aggregate() { return { _max: { version: 4 } }; },
      async create({ data }) {
        const row = { id: "v5", ...data };
        created.push(row);
        return row;
      },
    },
  };
  const page = { id: "page-1", title: "Partenaires", slug: "partenaires", status: "draft", sections: [] };
  const version = await createNextVersion(tx, page, { reason: "visual-editor-save" });
  assert.equal(version.version, 5);
  assert.equal(created[0].reason, "visual-editor-save");
});

test("rollback restores a draft partner page and snapshots the current published state first", async () => {
  const page = {
    id: "page-1",
    title: "Partenaires publiés",
    slug: "partenaires",
    status: "published",
    published: true,
    seoTitle: "Titre actuel",
    metaDescription: "Meta actuelle",
    h1: "H1 actuel",
    sections: [{
      sectionType: "partner-directory",
      jsonContent: { title: "Annuaire actuel", __builderType: "partner-directory" },
      displayOrder: 0,
      status: "draft",
    }],
    site: { id: "site-1" },
  };
  const restored = {
    id: "v1",
    pageId: page.id,
    version: 1,
    reason: "visual-editor-save",
    createdBy: null,
    createdAt: new Date("2026-08-19T10:00:00Z"),
    snapshot: {
      page: {
        title: "Nos partenaires",
        slug: "partenaires",
        status: "draft",
        published: false,
        seoTitle: "Ancien titre SEO",
        metaDescription: "Ancienne meta",
        h1: "Ancien H1",
      },
      sections: [{
        sectionType: "page-header",
        jsonContent: { title: "Ancien H1", __builderType: "page-header" },
        displayOrder: 0,
        status: "draft",
      }],
    },
  };
  const versions = [restored];

  const tx = {
    agencySitePageVersion: {
      async aggregate() { return { _max: { version: 1 } }; },
      async create({ data }) {
        const row = { id: "v2", ...data };
        versions.push(row);
        return row;
      },
    },
    agencySitePage: {
      async update({ data }) { Object.assign(page, data); return page; },
    },
    agencySiteSection: {
      async deleteMany() { page.sections = []; },
      async createMany({ data }) {
        page.sections = data.map(({ pageId: _pageId, ...section }) => section);
      },
    },
  };

  const prisma = {
    agencySitePage: {
      async findFirst() { return page; },
      async findUnique() { return { ...page, blocks: [], site: page.site }; },
    },
    agencySitePageVersion: {
      async findFirst({ where }) { return versions.find((item) => item.id === where.id && item.pageId === where.pageId) || null; },
    },
    async $transaction(callback) { return callback(tx); },
  };

  const result = await rollbackPageVersion({
    prisma,
    tenantId: "tenant-1",
    agencyId: 1,
    slug: "partenaires",
    versionId: "v1",
    input: { reason: "operator-rollback" },
  });

  assert.equal(result.page.status, "draft");
  assert.equal(result.page.published, false);
  assert.equal(result.page.h1, "Ancien H1");
  assert.equal(result.page.sections[0].sectionType, "page-header");
  assert.equal(result.safetyVersion.version, 2);
  assert.equal(versions[1].snapshot.page.status, "published");
  assert.equal(versions[1].snapshot.page.h1, "H1 actuel");
});

test("restored publication state is derived from the restored status", () => {
  assert.equal(restoredPageData({ status: "draft", published: true }, { title: "Page" }).published, false);
  assert.equal(restoredPageData({ status: "published", published: false }, { title: "Page" }).published, true);
});
