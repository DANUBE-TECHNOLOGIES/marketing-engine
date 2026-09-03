"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SitePublicationRepository,
} = require("../src/modules/site-publication/repository");

function createPrisma() {
  const calls = [];

  const tx = {
    agencySitePage: {
      updateMany: async (query) => {
        calls.push({ model: "page", query });
        return { count: 1 };
      },
    },
    pageBlock: {
      updateMany: async (query) => {
        calls.push({ model: "block", query });
        return { count: 14 };
      },
    },
    agencySiteSection: {
      updateMany: async (query) => {
        calls.push({ model: "section", query });
        return { count: 9 };
      },
    },
  };

  return {
    calls,
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
  };
}

test("MSE-25.9 publishes V2 blocks and legacy sections together with their page", async () => {
  const { prisma, calls } = createPrisma();
  const repository = new SitePublicationRepository({ prisma });

  const result = await repository.markPagePublished({
    siteId: "site-1",
    pageId: "page-home",
  });

  assert.equal(result.published, true);
  assert.equal(result.blocksPublished, 14);
  assert.equal(result.sectionsPublished, 9);

  const pageCall = calls.find((entry) => entry.model === "page");
  const blockCall = calls.find((entry) => entry.model === "block");
  const sectionCall = calls.find((entry) => entry.model === "section");

  assert.deepEqual(pageCall.query.where, {
    id: "page-home",
    siteId: "site-1",
  });
  assert.equal(pageCall.query.data.status, "published");
  assert.equal(pageCall.query.data.published, true);

  assert.equal(blockCall.query.where.pageId, "page-home");
  assert.deepEqual(blockCall.query.where.status, { not: "hidden" });
  assert.equal(blockCall.query.data.status, "published");

  assert.equal(sectionCall.query.where.pageId, "page-home");
  assert.deepEqual(sectionCall.query.where.status, { not: "hidden" });
  assert.equal(sectionCall.query.data.status, "published");
});

test("MSE-25.9 preserves hidden V2 blocks and legacy sections during publication", async () => {
  const { prisma, calls } = createPrisma();
  const repository = new SitePublicationRepository({ prisma });

  await repository.markPagePublished({
    siteId: "site-1",
    pageId: "page-home",
  });

  const blockCall = calls.find((entry) => entry.model === "block");
  const sectionCall = calls.find((entry) => entry.model === "section");

  assert.deepEqual(blockCall.query.where.status, { not: "hidden" });
  assert.deepEqual(sectionCall.query.where.status, { not: "hidden" });
});

test("MSE-25.9 unpublishes only previously published V2 blocks and legacy sections", async () => {
  const { prisma, calls } = createPrisma();
  const repository = new SitePublicationRepository({ prisma });

  const result = await repository.markPageUnpublished({
    siteId: "site-1",
    pageId: "page-home",
  });

  assert.equal(result.published, false);
  assert.equal(result.blocksUnpublished, 14);
  assert.equal(result.sectionsUnpublished, 9);

  const blockCall = calls.find((entry) => entry.model === "block");
  const sectionCall = calls.find((entry) => entry.model === "section");

  assert.equal(blockCall.query.where.status, "published");
  assert.equal(blockCall.query.data.status, "draft");
  assert.equal(sectionCall.query.where.status, "published");
  assert.equal(sectionCall.query.data.status, "draft");
});

test("MSE-25.9 touches no child content when the page does not belong to the site", async () => {
  let blockTouched = false;
  let sectionTouched = false;

  const prisma = {
    $transaction: async (callback) =>
      callback({
        agencySitePage: {
          updateMany: async () => ({ count: 0 }),
        },
        pageBlock: {
          updateMany: async () => {
            blockTouched = true;
            return { count: 1 };
          },
        },
        agencySiteSection: {
          updateMany: async () => {
            sectionTouched = true;
            return { count: 1 };
          },
        },
      }),
  };

  const repository = new SitePublicationRepository({ prisma });

  await assert.rejects(
    () => repository.markPagePublished({ siteId: "site-a", pageId: "page-b" }),
    (error) => error.code === "PAGE_NOT_FOUND"
  );

  assert.equal(blockTouched, false);
  assert.equal(sectionTouched, false);
});
