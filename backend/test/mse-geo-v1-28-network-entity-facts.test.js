const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildNetworkEntityFacts,
} = require("../src/modules/minisite-structured-data/network-entity-facts");

function site(slug, status = "published") {
  const city = slug === "maurepas" ? "Maurepas" : "Ozoir-la-Ferrière";
  return {
    id: `site-${slug}`,
    slug,
    status,
    agency: {
      id: `agency-${slug}`,
      name: `Mondescale ${city}`,
      city,
      address: "1 rue du Voyage",
      postalCode: slug === "maurepas" ? "78310" : "77330",
      phone: "+33100000000",
      email: `${slug}@example.test`,
      seoSite: { targetCities: [city] },
    },
    pages: [],
  };
}

function fakeService(sites) {
  return {
    publicOrigin: "https://agences.mondescale.com",
    repository: {
      async listSites() { return sites; },
    },
    async enrichSitesWithKnowledge(items) { return items; },
  };
}

test("network Entity Facts serves only public valid sites in deterministic slug order", async () => {
  const result = await buildNetworkEntityFacts({
    service: fakeService([
      site("ozoir"),
      site("draft-agency", "draft"),
      site("maurepas"),
    ]),
    tenantId: "tenant-1",
  });

  assert.equal(result.provenance.factsOnly, true);
  assert.equal(result.provenance.inference, false);
  assert.equal(result.provenance.providerCall, false);
  assert.equal(result.provenance.reviewsIncluded, false);
  assert.equal(result.provenance.rankingIncluded, false);
  assert.equal(result.summary.publicSiteCount, 2);
  assert.equal(result.summary.servedEntityCount, 2);
  assert.deepEqual(result.entities.map((item) => item.siteSlug), ["maurepas", "ozoir"]);
});

test("exact siteSlug filter never performs fuzzy matching", async () => {
  const service = fakeService([site("maurepas"), site("ozoir")]);
  const result = await buildNetworkEntityFacts({ service, tenantId: "tenant-1", siteSlug: "maurepas" });
  assert.equal(result.entities.length, 1);
  assert.equal(result.entities[0].siteSlug, "maurepas");

  await assert.rejects(
    () => buildNetworkEntityFacts({ service, tenantId: "tenant-1", siteSlug: "maure" }),
    /Mini-site public introuvable/
  );
});

test("network projection inherits Entity Facts anti-review contract", async () => {
  const result = await buildNetworkEntityFacts({ service: fakeService([site("maurepas")]), tenantId: "tenant-1" });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("aggregateRating"), false);
  assert.equal(serialized.includes('"review"'), false);
  assert.equal(serialized.includes("ranking"), true); // provenance explicitly states rankingIncluded=false
  assert.equal(result.provenance.rankingIncluded, false);
});

test("network Entity Facts endpoint is GET-only and supports exact siteSlug query", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/modules/minisite-structured-data/routes.js"),
    "utf8"
  );
  assert.match(routes, /router\.get\("\/minisite-structured-data\/entities"/);
  assert.match(routes, /request\.query\?\.siteSlug/);
  assert.match(routes, /buildNetworkEntityFacts/);
  assert.doesNotMatch(routes, /router\.post\("\/minisite-structured-data\/entities"/);
});
