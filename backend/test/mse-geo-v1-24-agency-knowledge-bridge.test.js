const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAgencyKnowsAbout,
  knowledgeFactFromThing,
  publicAgencyKnowledgeRelations,
} = require("../src/modules/minisite-structured-data/agency-knowledge");
const {
  buildEntityFacts,
} = require("../src/modules/minisite-structured-data/entity-facts");
const {
  buildStructuredDataPlan,
} = require("../src/modules/minisite-structured-data/planner");
const {
  MiniSiteStructuredDataService,
} = require("../src/modules/minisite-structured-data/service");

function relation(relationType, target) {
  return { relationType, target };
}

function agencyKnowledge() {
  return {
    id: "agency-k-1",
    type: "agency",
    slug: "mondescale-maurepas",
    title: "Mondescale Maurepas",
    status: "published",
    language: "fr",
    outgoingRelations: [
      relation("recommends", { id: "dest-1", type: "destination", slug: "sicile", title: "Sicile", status: "published", language: "fr" }),
      relation("features", { id: "theme-1", type: "travel_theme", slug: "croisieres", title: "Croisières", status: "published", language: "fr" }),
      relation("available_in", { id: "cruise-1", type: "cruise", slug: "seychelles", title: "Croisière aux Seychelles", status: "published", language: "fr" }),
      relation("expert_in", { id: "exp-1", type: "expertise", slug: "luxe", title: "Luxe", status: "published", language: "fr" }),
      relation("recommends", { id: "draft-1", type: "destination", slug: "draft", title: "Draft", status: "draft", language: "fr" }),
      relation("recommends", { id: "article-1", type: "article", slug: "article", title: "Article", status: "published", language: "fr" }),
    ],
  };
}

test("Agency Knowledge bridge exposes only explicit published allowlisted relations", () => {
  const items = publicAgencyKnowledgeRelations({ agencyKnowledge: agencyKnowledge() });
  assert.deepEqual(
    items.map((item) => [item.relationType, item.target.id]),
    [
      ["recommends", "dest-1"],
      ["features", "theme-1"],
      ["available_in", "cruise-1"],
    ]
  );
});

test("Agency knowsAbout keeps exact Knowledge id, slug, type and relationType in PropertyValue identifiers", () => {
  const knowsAbout = buildAgencyKnowsAbout({ agencyKnowledge: agencyKnowledge() });
  assert.equal(knowsAbout.length, 3);
  assert.deepEqual(knowledgeFactFromThing(knowsAbout[0]), {
    id: "dest-1",
    slug: "sicile",
    type: "destination",
    relationType: "recommends",
    title: "Sicile",
  });
});

test("structured graph and Entity Facts expose the same explicit Agency Knowledge facts", () => {
  const plan = buildStructuredDataPlan({
    publicOrigin: "https://agences.mondescale.com",
    sites: [
      {
        id: "site-1",
        slug: "maurepas",
        status: "published",
        agency: {
          id: 1,
          name: "Mondescale Maurepas",
          city: "Maurepas",
          address: "6 place du Sancerrois",
          postalCode: "78310",
          phone: "0130519036",
          email: "maurepas@example.test",
          seoSite: { targetCities: ["Élancourt"] },
        },
        pages: [],
        agencyKnowledge: agencyKnowledge(),
      },
    ],
  });

  assert.equal(plan.items[0].validation.valid, true);
  const agencyNode = plan.items[0].graph["@graph"].find((node) =>
    Array.isArray(node["@type"]) && node["@type"].includes("TravelAgency")
  );
  assert.equal(agencyNode.knowsAbout.length, 3);

  const facts = buildEntityFacts({
    version: plan.version,
    siteSlug: "maurepas",
    agencyId: 1,
    graph: plan.items[0].graph,
  });

  assert.deepEqual(facts.agency.knowledge, [
    { id: "dest-1", slug: "sicile", type: "destination", relationType: "recommends", title: "Sicile" },
    { id: "theme-1", slug: "croisieres", type: "travel_theme", relationType: "features", title: "Croisières" },
    { id: "cruise-1", slug: "seychelles", type: "cruise", relationType: "available_in", title: "Croisière aux Seychelles" },
  ]);
  assert.equal(facts.provenance.inference, false);
});

test("site enrichment resolves canonical Agency Knowledge even without any Person Knowledge id", async () => {
  const calls = [];
  const repository = {
    async listPublishedKnowledgePeopleByIds(ids) {
      calls.push(["people", ids]);
      return [];
    },
    async listPublishedAgencyKnowledgeBySlugs(slugs) {
      calls.push(["agency", slugs]);
      return [agencyKnowledge()];
    },
  };
  const service = new MiniSiteStructuredDataService({ repository });
  const [site] = await service.enrichSitesWithKnowledge([
    { slug: "maurepas", pages: [] },
  ]);

  assert.equal(site.agencyKnowledge.id, "agency-k-1");
  assert.deepEqual(calls, [["agency", ["mondescale-maurepas"]]]);
});

test("legacy injected repository without Agency Knowledge capability degrades safely", async () => {
  const repository = {
    async listPublishedKnowledgePeopleByIds() {
      return [];
    },
  };
  const service = new MiniSiteStructuredDataService({ repository });
  const [site] = await service.enrichSitesWithKnowledge([
    { slug: "maurepas", pages: [] },
  ]);

  assert.equal(site.agencyKnowledge, null);
});

test("invalid or unpublished Agency Knowledge never produces knowsAbout", () => {
  assert.deepEqual(buildAgencyKnowsAbout({ agencyKnowledge: { ...agencyKnowledge(), status: "draft" } }), []);
  assert.deepEqual(buildAgencyKnowsAbout({ agencyKnowledge: null }), []);
});
