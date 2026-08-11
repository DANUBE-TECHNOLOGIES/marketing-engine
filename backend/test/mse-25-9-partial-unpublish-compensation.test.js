"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  ResilientUnpublishService,
  pageIsPublished,
} = require("../src/modules/site-publication/resilient-unpublish-service");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.9 page publication state recognises persisted public pages", () => {
  assert.equal(pageIsPublished({ published: true }), true);
  assert.equal(pageIsPublished({ status: "published" }), true);
  assert.equal(pageIsPublished({ published: false, status: "draft" }), false);
});

test("MSE-25.9 partial unpublish failure restores pages that were public before the operation", async () => {
  const publishedAgain = [];
  let siteRestored = false;
  let reads = 0;

  const repository = {
    site: async () => {
      reads += 1;
      if (reads === 1) {
        return {
          id: "site-1",
          slug: "bois-colombes",
          status: "published",
          publishedAt: new Date("2026-08-11T08:00:00.000Z"),
          pages: [
            { id: "page-home", slug: "home", status: "published", published: true },
            { id: "page-contact", slug: "contact", status: "published", published: true },
          ],
        };
      }

      return {
        id: "site-1",
        slug: "bois-colombes",
        status: "published",
        publishedAt: new Date("2026-08-11T08:00:00.000Z"),
        pages: [
          { id: "page-home", slug: "home", status: "draft", published: false },
          { id: "page-contact", slug: "contact", status: "published", published: true },
        ],
      };
    },
    markSitePublished: async () => {
      siteRestored = true;
    },
  };

  const failure = Object.assign(new Error("network failure"), {
    code: "PAGE_PUBLICATION_FAILED",
    details: {},
  });

  const resilient = new ResilientUnpublishService({
    service: {
      unpublish: async () => {
        throw failure;
      },
    },
    repository,
    pagePublicationClient: {
      publish: async ({ pageId }) => {
        publishedAgain.push(String(pageId));
      },
    },
  });

  await assert.rejects(
    () => resilient.unpublish({ siteId: "site-1", headers: {} }),
    (error) => {
      assert.equal(error.code, "PAGE_PUBLICATION_FAILED");
      assert.equal(error.details.unpublicationCompensation.length, 1);
      assert.equal(error.details.unpublicationCompensation[0].pageId, "page-home");
      return true;
    }
  );

  assert.deepEqual(publishedAgain, ["page-home"]);
  assert.equal(siteRestored, true);
});

test("MSE-25.9 explicit unpublish route uses the resilient compensation layer", () => {
  const routes = source("backend/src/modules/site-publication/routes.js");
  assert.match(routes, /new ResilientUnpublishService\(/);
  assert.match(routes, /await unpublishService\.unpublish\(/);
});
