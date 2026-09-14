"use strict";

const crypto = require("crypto");
const test = require("node:test");
const assert = require("node:assert/strict");
const { routeFingerprint } = require("../scripts/mse-25-208-melun-seo-editorial-v1");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

// Independent reproduction of MSE-25.207 publicTopologyFingerprint.
function auditedTopologyFingerprint(site) {
  return hash({
    site: {
      id: site.id,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
    },
    pages: (site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      status: page.status,
      published: page.published,
      schemaType: page.schemaType,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        name: block.name,
        blockType: block.blockType,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        displayOrder: block.displayOrder,
      })),
    })),
  });
}

test("MSE-25.208 topology fingerprint is exactly compatible with MSE-25.207", () => {
  const fixture = {
    id: "site-8",
    slug: "tui-store-melun",
    basePath: "/agence/tui-store-melun",
    status: "published",
    theme: { ignored: true },
    pages: [
      {
        id: "home",
        slug: "",
        path: "/agence/tui-store-melun",
        pageType: "HOME",
        status: "published",
        published: true,
        schemaType: "TravelAgency",
        menuTitle: "ignored",
        displayOrder: 99,
        seoTitle: "ignored editorial field",
        blocks: [
          {
            id: "hero",
            name: null,
            blockType: "hero",
            status: "published",
            visibleDesktop: true,
            visibleMobile: true,
            displayOrder: 0,
            version: 42,
            content: { ignored: true },
          },
        ],
      },
    ],
  };

  assert.equal(routeFingerprint(fixture), auditedTopologyFingerprint(fixture));
});
