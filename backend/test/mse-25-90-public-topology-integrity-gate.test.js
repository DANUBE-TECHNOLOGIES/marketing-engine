const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_REQUIRED_PATHS,
  buildTopology,
  parseAgencyUrl,
  sitemapUrls,
  summarizeTopology,
} = require("../scripts/mse-25-90-public-topology-integrity-gate");

const ORIGIN = "https://agences.mondescale.com";

function siteUrls(siteSlug, extra = []) {
  return [
    "",
    "agence",
    "equipe",
    "partenaires",
    "services",
    "destinations",
    "inspiration",
    "contact",
    ...extra,
  ].map((path) => `${ORIGIN}/agence/${siteSlug}${path ? `/${path}` : ""}`);
}

test("MSE-25.90 parses canonical agency URLs and rejects foreign topology", () => {
  assert.deepEqual(
    parseAgencyUrl(`${ORIGIN}/agence/tui-store-amilly/inspiration`, ORIGIN),
    {
      url: `${ORIGIN}/agence/tui-store-amilly/inspiration`,
      siteSlug: "tui-store-amilly",
      relativePath: "inspiration",
      segments: ["inspiration"],
    }
  );

  assert.equal(parseAgencyUrl("https://example.com/agence/tui-store-amilly", ORIGIN), null);
  assert.equal(parseAgencyUrl(`${ORIGIN}/sites/tui-store-amilly`, ORIGIN), null);
});

test("MSE-25.90 extracts sitemap URLs without inventing entries", () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc>${ORIGIN}/agence/a</loc></url><url><loc>${ORIGIN}/agence/b?x=1&amp;y=2</loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml), [
    `${ORIGIN}/agence/a`,
    `${ORIGIN}/agence/b?x=1&y=2`,
  ]);
});

test("MSE-25.90 accepts variable per-site URL counts when canonical core routes exist", () => {
  const urls = [
    ...siteUrls("ambassade-fram-mondescale-gien"),
    ...siteUrls("tui-store-amilly", ["destination/tunisie", "destination/sicile"]),
  ];

  const topology = buildTopology(urls, ORIGIN);
  const summary = summarizeTopology(topology, {
    expectedSites: ["ambassade-fram-mondescale-gien", "tui-store-amilly"],
    expectedSiteCount: 2,
    requiredPaths: DEFAULT_REQUIRED_PATHS,
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.failures.length, 0);
  assert.deepEqual(
    summary.siteDetails.map((site) => [site.siteSlug, site.urlCount]),
    [
      ["ambassade-fram-mondescale-gien", 8],
      ["tui-store-amilly", 10],
    ]
  );
});

test("MSE-25.90 fails closed when an expected published site disappears", () => {
  const topology = buildTopology(siteUrls("tui-store-amilly"), ORIGIN);
  const summary = summarizeTopology(topology, {
    expectedSites: ["tui-store-amilly", "tui-store-melun"],
    expectedSiteCount: 2,
    requiredPaths: DEFAULT_REQUIRED_PATHS,
  });

  assert.equal(summary.ok, false);
  assert.deepEqual(summary.missingSites, ["tui-store-melun"]);
  assert.ok(summary.failures.includes("missing-published-site"));
  assert.ok(summary.failures.includes("published-site-count-mismatch"));
});

test("MSE-25.90 fails closed on legacy aliases and missing canonical core routes", () => {
  const urls = siteUrls("tui-store-amilly").filter((url) => !url.endsWith("/contact"));
  urls.push(`${ORIGIN}/agence/tui-store-amilly/inspirations`);

  const topology = buildTopology(urls, ORIGIN);
  const summary = summarizeTopology(topology, {
    expectedSites: ["tui-store-amilly"],
    expectedSiteCount: 1,
    requiredPaths: DEFAULT_REQUIRED_PATHS,
  });

  assert.equal(summary.ok, false);
  assert.equal(topology.legacyUrls.length, 1);
  assert.ok(summary.failures.includes("legacy-public-route"));
  assert.ok(summary.failures.includes("missing-required-route"));
  assert.deepEqual(summary.siteDetails[0].missingPaths, ["contact"]);
});

test("MSE-25.90 rejects duplicate sitemap URLs and unexpected published sites", () => {
  const amilly = siteUrls("tui-store-amilly");
  const topology = buildTopology([
    ...amilly,
    amilly[0],
    ...siteUrls("rogue-site"),
  ], ORIGIN);

  const summary = summarizeTopology(topology, {
    expectedSites: ["tui-store-amilly"],
    expectedSiteCount: 1,
    requiredPaths: DEFAULT_REQUIRED_PATHS,
  });

  assert.equal(summary.ok, false);
  assert.equal(topology.duplicateUrls.length, 1);
  assert.deepEqual(summary.unexpectedSites, ["rogue-site"]);
  assert.ok(summary.failures.includes("duplicate-sitemap-url"));
  assert.ok(summary.failures.includes("unexpected-published-site"));
  assert.ok(summary.failures.includes("published-site-count-mismatch"));
});
