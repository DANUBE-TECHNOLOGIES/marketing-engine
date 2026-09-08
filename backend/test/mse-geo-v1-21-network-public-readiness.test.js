const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  auditItem,
  report,
  scoreFor,
  statusFor,
} = require("../src/knowledge/network-public-readiness.service");

const ORG = "https://www.mondescale.com/#organization";

function site({ linked = true } = {}) {
  return {
    id: "site-1",
    agencyId: 1,
    slug: "maurepas",
    status: "published",
    publishedAt: new Date("2026-09-01T00:00:00Z"),
    agency: {
      id: 1,
      name: "Mondescale Maurepas",
      city: "Maurepas",
      seoSite: {
        targetCities: ["Élancourt", "Coignières"],
      },
    },
    pages: [
      {
        id: "page-1",
        slug: "accueil",
        status: "published",
        published: true,
        blocks: [
          {
            id: "block-1",
            blockType: "team",
            status: "published",
            content: {
              members: [
                {
                  name: "Anisia",
                  ...(linked ? { knowledgeEntityId: "person-anisia" } : {}),
                },
              ],
            },
          },
        ],
      },
    ],
    knowledgePeople: linked
      ? [
          {
            id: "person-anisia",
            type: "person",
            status: "published",
          },
        ]
      : [],
  };
}

function readyItem() {
  const agencyId = "https://agences.mondescale.com/agence/maurepas#travel-agency";
  return {
    agencyId: 1,
    agencyName: "Mondescale Maurepas",
    siteSlug: "maurepas",
    validation: { valid: true, issues: [] },
    graph: {
      "@graph": [
        {
          "@type": "Organization",
          "@id": ORG,
          name: "Mondescale Voyages",
        },
        {
          "@type": ["TravelAgency", "LocalBusiness"],
          "@id": agencyId,
          parentOrganization: { "@id": ORG },
          areaServed: [
            { "@type": "City", name: "Maurepas" },
            { "@type": "City", name: "Élancourt" },
          ],
        },
        {
          "@type": "Person",
          "@id": "person-node",
          name: "Anisia",
          worksFor: { "@id": agencyId },
          knowsAbout: [],
        },
      ],
    },
  };
}

test("ready graph does not require invented expertise", () => {
  const result = auditItem(readyItem(), site());
  assert.equal(result.status, "ready");
  assert.equal(result.score, 100);
  assert.equal(result.metrics.publicPersonCount, 1);
  assert.equal(result.metrics.knowledgeLinkedPersonCount, 1);
  assert.equal(result.metrics.knowsAboutCount, 0);
  assert.deepEqual(result.metrics.areaServed, ["Maurepas", "Élancourt"]);
  assert.deepEqual(result.issues, []);
});

test("missing team Knowledge link is partial, not fabricated", () => {
  const result = auditItem(readyItem(), site({ linked: false }));
  assert.equal(result.status, "partial");
  assert.equal(result.metrics.explicitTeamMemberCount, 1);
  assert.equal(result.metrics.knowledgeLinkedPersonCount, 0);
  assert.ok(result.issues.some((issue) => issue.code === "team_knowledge_link_incomplete"));
});

test("broken Organization or TravelAgency contract blocks readiness", () => {
  const item = readyItem();
  item.graph["@graph"] = item.graph["@graph"].filter((node) => node["@type"] !== "Organization");
  const result = auditItem(item, site());
  assert.equal(result.status, "blocked");
  assert.ok(result.issues.some((issue) => issue.code === "canonical_organization_missing"));
});

test("Person worksFor mismatch is surfaced without rewriting Person", () => {
  const item = readyItem();
  const person = item.graph["@graph"].find((node) => node["@type"] === "Person");
  person.worksFor = { "@id": "wrong-agency" };
  const result = auditItem(item, site());
  assert.equal(result.status, "partial");
  assert.ok(result.issues.some((issue) => issue.code === "person_works_for_mismatch"));
});

test("status and score are deterministic from explicit issue codes", () => {
  const issues = [
    { code: "area_served_missing" },
    { code: "team_knowledge_link_incomplete" },
  ];
  assert.equal(statusFor(issues), "partial");
  assert.equal(scoreFor(issues), 75);
  assert.equal(statusFor([{ code: "travel_agency_missing" }]), "blocked");
});

test("network report filters out non-public mini-sites", async () => {
  const published = site();
  const draft = {
    ...site(),
    id: "site-draft",
    slug: "draft-site",
    status: "draft",
    publishedAt: null,
  };

  const result = await report({
    tenantId: "tenant-1",
    repository: {
      listSites: async () => [published, draft],
    },
    structuredDataService: {
      publicOrigin: "https://agences.mondescale.com",
      enrichSitesWithKnowledge: async (sites) => sites,
    },
  });

  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.summary.publishedSiteCount, 1);
  assert.equal(result.agencies.length, 1);
  assert.equal(result.agencies[0].siteSlug, "maurepas");
});

test("readiness route is GET-only capability and mounted in network router", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );
  assert.match(routes, /router\.get\(\s*[\r\n ]*"\/public-readiness"/);
  assert.doesNotMatch(routes, /router\.post\(\s*[\r\n ]*"\/public-readiness"/);
});
