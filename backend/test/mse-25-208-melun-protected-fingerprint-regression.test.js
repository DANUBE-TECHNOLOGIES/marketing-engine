"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { protectedFingerprint } = require("../scripts/mse-25-208-melun-seo-editorial-v1.js");

function fixture() {
  return {
    id: "site-1",
    slug: "tui-store-melun",
    basePath: "/agence/tui-store-melun",
    status: "published",
    theme: "default",
    agency: { id: 8, city: "Melun", name: "TUI STORE Melun" },
    pages: [
      {
        id: "page-home",
        slug: "",
        path: "/agence/tui-store-melun",
        pageType: "HOME",
        title: "Accueil",
        menuTitle: null,
        menuLocation: null,
        displayOrder: 0,
        schemaType: "TravelAgency",
        status: "published",
        published: true,
        seoTitle: "Before SEO",
        metaDescription: "Before meta",
        h1: "Before H1",
        blocks: [
          {
            id: "mse25125bnmelunhome",
            blockType: "rich_text",
            name: null,
            content: { title: "Before title", html: "<p>Before</p>", alignment: "left" },
            settings: null,
            seo: null,
            displayOrder: 12,
            status: "published",
            visibleDesktop: true,
            visibleMobile: true,
            version: 1,
          },
          {
            id: "non-target-block",
            blockType: "text",
            name: null,
            content: { title: "Stable", text: "Stable" },
            settings: null,
            seo: null,
            displayOrder: 13,
            status: "published",
            visibleDesktop: true,
            visibleMobile: true,
            version: 3,
          },
        ],
      },
    ],
  };
}

test("MSE-25.208 protected fingerprint ignores intended target SEO/content/version changes", () => {
  const before = fixture();
  const after = structuredClone(before);

  after.pages[0].seoTitle = "After SEO";
  after.pages[0].metaDescription = "After meta";
  after.pages[0].h1 = "After H1";
  after.pages[0].blocks[0].content.title = "After title";
  after.pages[0].blocks[0].content.html = "<p>After</p>";
  after.pages[0].blocks[0].version = 2;

  assert.equal(protectedFingerprint(after), protectedFingerprint(before));
});

test("MSE-25.208 protected fingerprint still detects non-target changes", () => {
  const before = fixture();
  const after = structuredClone(before);
  after.pages[0].blocks[1].version = 4;

  assert.notEqual(protectedFingerprint(after), protectedFingerprint(before));
});
