"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectLinks,
  isRedirectStatus,
  summarize,
} = require("../scripts/mse-25-89-canonical-internal-link-gate");

test("redirect status helper covers canonical HTTP redirect codes", () => {
  for (const status of [301, 302, 303, 307, 308]) {
    assert.equal(isRedirectStatus(status), true);
  }
  for (const status of [200, 204, 304, 400, 404, 500]) {
    assert.equal(isRedirectStatus(status), false);
  }
});

test("collectLinks extracts unique internal agency targets while preserving edges", () => {
  const pages = [
    {
      url: "https://agences.mondescale.com/agence/demo/contact",
      html: [
        '<a href="/agence/demo/services">Services</a>',
        '<a href="/agence/demo/inspiration">Inspiration</a>',
        '<a href="/agence/demo/inspiration">Inspiration bis</a>',
        '<a href="mailto:test@example.com">Email</a>',
      ].join(""),
    },
  ];

  const graph = collectLinks(pages);
  assert.equal(graph.edges.length, 3);
  assert.deepEqual(graph.targets.sort(), [
    "https://agences.mondescale.com/agence/demo/inspiration",
    "https://agences.mondescale.com/agence/demo/services",
  ]);
});

test("summary fails when a rendered internal link redirects", () => {
  const summary = summarize({
    sitemap: ["https://agences.mondescale.com/agence/demo"],
    pages: [{
      url: "https://agences.mondescale.com/agence/demo",
      finalUrl: "https://agences.mondescale.com/agence/demo",
      status: 200,
    }],
    edges: [{
      source: "https://agences.mondescale.com/agence/demo/contact",
      target: "https://agences.mondescale.com/agence/demo/inspirations",
    }],
    targetResults: [{
      url: "https://agences.mondescale.com/agence/demo/inspirations",
      status: 308,
      location: "/agence/demo/inspiration",
      redirected: true,
      ok: false,
    }],
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.redirectTargets.length, 1);
  assert.equal(summary.redirectEdges.length, 1);
});

test("summary passes when sitemap pages and internal links are direct 200 responses", () => {
  const summary = summarize({
    sitemap: ["https://agences.mondescale.com/agence/demo"],
    pages: [{
      url: "https://agences.mondescale.com/agence/demo",
      finalUrl: "https://agences.mondescale.com/agence/demo",
      status: 200,
    }],
    edges: [{
      source: "https://agences.mondescale.com/agence/demo/contact",
      target: "https://agences.mondescale.com/agence/demo/inspiration",
    }],
    targetResults: [{
      url: "https://agences.mondescale.com/agence/demo/inspiration",
      status: 200,
      location: null,
      redirected: false,
      ok: true,
    }],
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.redirectTargets.length, 0);
  assert.equal(summary.failedTargets.length, 0);
});
