const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildEntityFacts,
} = require("../src/modules/minisite-structured-data/entity-facts");

function preview() {
  const agencyId = "https://agences.mondescale.com/agence/maurepas#travel-agency";
  return {
    version: "1.0.0",
    siteSlug: "maurepas",
    agencyId: 1,
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
          "@id": agencyId,
          name: "Mondescale Maurepas",
          url: "https://agences.mondescale.com/agence/maurepas",
          telephone: "+33130519036",
          email: "maurepas@example.test",
          address: {
            "@type": "PostalAddress",
            streetAddress: "6 place du Sancerrois",
            postalCode: "78310",
            addressLocality: "Maurepas",
            addressCountry: "FR",
          },
          areaServed: [
            { "@type": "City", name: "Maurepas" },
            { "@type": "City", name: "Élancourt" },
          ],
          parentOrganization: {
            "@id": "https://www.mondescale.com/#organization",
          },
          sameAs: ["https://example.test/profile"],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: 5,
          },
          review: [{ author: "ignored" }],
        },
        {
          "@type": "Person",
          "@id": "https://agences.mondescale.com/agence/maurepas#person-anisia",
          name: "Anisia",
          jobTitle: "Conseillère",
          description: "Conseillère de l'agence",
          image: "/anisia.jpg",
          worksFor: { "@id": agencyId },
          knowsAbout: ["Croisières"],
        },
      ],
    },
  };
}

test("Entity Facts is a concise projection of the canonical graph", () => {
  const facts = buildEntityFacts(preview());

  assert.equal(facts.siteSlug, "maurepas");
  assert.equal(facts.agency.type, "TravelAgency");
  assert.equal(facts.agency.name, "Mondescale Maurepas");
  assert.deepEqual(facts.agency.areaServed, [
    { type: "City", name: "Maurepas" },
    { type: "City", name: "Élancourt" },
  ]);
  assert.equal(facts.organization.id, "https://www.mondescale.com/#organization");
  assert.equal(facts.people.length, 1);
  assert.equal(facts.people[0].name, "Anisia");
  assert.deepEqual(facts.people[0].knowsAbout, ["Croisières"]);
  assert.equal(facts.provenance.source, "canonical-structured-data-graph");
  assert.equal(facts.provenance.factsOnly, true);
  assert.equal(facts.provenance.inference, false);
  assert.equal(facts.provenance.providerCall, false);
});

test("Entity Facts deliberately excludes self-serving rating and review fields", () => {
  const facts = buildEntityFacts(preview());
  const serialized = JSON.stringify(facts);

  assert.equal(serialized.includes("aggregateRating"), false);
  assert.equal(serialized.includes('"review"'), false);
  assert.equal(serialized.includes("ratingValue"), false);
});

test("Entity Facts never creates knowsAbout when it is absent from canonical Person", () => {
  const input = preview();
  delete input.graph["@graph"][2].knowsAbout;
  const facts = buildEntityFacts(input);

  assert.equal(Object.prototype.hasOwnProperty.call(facts.people[0], "knowsAbout"), false);
});

test("missing canonical TravelAgency refuses the public facts projection", () => {
  const input = preview();
  input.graph["@graph"] = input.graph["@graph"].filter(
    (node) => !Array.isArray(node["@type"])
  );

  assert.throws(
    () => buildEntityFacts(input),
    /TravelAgency canonique absente/
  );
});

test("public Entity Facts route derives from previewSite and is GET-only", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/modules/minisite-structured-data/routes.js"),
    "utf8"
  );

  assert.match(routes, /"\/minisite-structured-data\/entities\/:siteSlug"/);
  assert.match(routes, /structuredDataService\.previewSite/);
  assert.match(routes, /buildEntityFacts\(preview\)/);
  assert.match(routes, /Cache-Control/);
  assert.doesNotMatch(routes, /router\.post\("\/minisite-structured-data\/entities/);
});
