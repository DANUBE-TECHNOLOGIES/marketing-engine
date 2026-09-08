const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  projectGeoNetwork,
  projectGeoSite,
} = require("../src/modules/minisite-structured-data/geo-feed");

function item(slug = "maurepas") {
  return {
    siteSlug: slug,
    agencyId: 1,
    agencyName: "Mondescale Maurepas",
    validation: { valid: true, issues: [] },
    graph: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.mondescale.com/#organization",
          name: "Mondescale Voyages",
          url: "https://www.mondescale.com",
        },
        {
          "@type": ["TravelAgency", "LocalBusiness"],
          "@id": `https://agences.mondescale.com/agence/${slug}#travel-agency`,
          name: "Mondescale Maurepas",
          url: `https://agences.mondescale.com/agence/${slug}`,
          telephone: "0130519036",
          email: "maurepas@example.test",
          address: { "@type": "PostalAddress", addressLocality: "Maurepas" },
          areaServed: [
            { "@type": "City", name: "Maurepas" },
            { "@type": "City", name: "Élancourt" },
          ],
          parentOrganization: { "@id": "https://www.mondescale.com/#organization" },
          aggregateRating: { ratingValue: 5 },
        },
        {
          "@type": "Person",
          "@id": `https://agences.mondescale.com/agence/${slug}#person-anisia`,
          name: "Anisia",
          jobTitle: "Conseillère",
          worksFor: { "@id": `https://agences.mondescale.com/agence/${slug}#travel-agency` },
          knowsAbout: ["Croisières"],
        },
        { "@type": "WebPage", name: "Page éditoriale à ne pas projeter" },
      ],
    },
  };
}

test("per-agency GEO feed exposes only canonical entity facts", () => {
  const feed = projectGeoSite(item());

  assert.equal(feed.version, "mse-geo-feed-v1");
  assert.equal(feed.siteSlug, "maurepas");
  assert.equal(feed.organization.id, "https://www.mondescale.com/#organization");
  assert.equal(feed.agency.name, "Mondescale Maurepas");
  assert.deepEqual(feed.agency.areaServed.map((entry) => entry.name), ["Maurepas", "Élancourt"]);
  assert.equal(feed.people.length, 1);
  assert.deepEqual(feed.people[0].knowsAbout, ["Croisières"]);
  assert.equal("aggregateRating" in feed.agency, false);
  assert.equal(JSON.stringify(feed).includes("Page éditoriale"), false);
});

test("network GEO feed indexes all valid published entity feeds deterministically", () => {
  const second = item("dax");
  second.agencyId = 2;
  second.agencyName = "Mondescale Dax";
  second.graph["@graph"][1].name = "Mondescale Dax";
  const invalid = item("invalid");
  invalid.validation.valid = false;

  const feed = projectGeoNetwork({
    publicOrigin: "https://agences.mondescale.com",
    items: [second, invalid, item("maurepas")],
  });

  assert.equal(feed.summary.agencyCount, 2);
  assert.equal(feed.summary.personCount, 2);
  assert.deepEqual(feed.agencies.map((agency) => agency.siteSlug), ["dax", "maurepas"]);
  assert.equal(feed.agencies[0].geoFeedUrl, "https://agences.mondescale.com/agence/dax/geo.json");
});

test("backend routes expose cached read-only GEO feeds", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/modules/minisite-structured-data/routes.js"),
    "utf8"
  );
  assert.match(routes, /\/minisite-structured-data\/geo\/network/);
  assert.match(routes, /\/minisite-structured-data\/sites\/:siteSlug\/geo/);
  assert.match(routes, /projectGeoNetwork/);
  assert.match(routes, /projectGeoSite/);
  assert.match(routes, /stale-while-revalidate=3600/);
  assert.doesNotMatch(routes, /geo\/network[^\n]*router\.post/);
});
