"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const {
  MONDESCALE_ORGANIZATION_ID,
  buildAreaServed,
  buildMondescaleOrganization,
  buildTravelAgency,
  targetCityNames,
} = require("../src/modules/minisite-structured-data/travel-agency");
const {
  publicTargetCities,
  sanitizePublicAgency,
} = require("../src/modules/public-site-read/section-aware-service");
const {
  buildStructuredDataPlan,
} = require("../src/modules/minisite-structured-data/planner");

const agency = {
  id: 1,
  name: "Mondescale Maurepas",
  city: "Maurepas",
  address: "6 place du Sancerrois",
  postalCode: "78310",
  phone: "0130519036",
  email: "maurepas@example.test",
  seoSite: {
    targetCities: [
      "Élancourt",
      "Coignières",
      "La Verrière",
      "Maurepas",
    ],
  },
};

const site = {
  id: "site-maurepas",
  slug: "maurepas",
  agency,
  pages: [
    {
      id: "page-team",
      slug: "equipe",
      title: "Équipe",
      blocks: [
        {
          blockType: "team",
          content: {
            members: [
              { id: "anisia", name: "Anisia", role: "Conseillère voyage" },
            ],
          },
        },
      ],
    },
  ],
};

test("network GEO keeps main city plus explicit target cities only", () => {
  assert.deepEqual(targetCityNames(agency), [
    "Maurepas",
    "Élancourt",
    "Coignières",
    "La Verrière",
  ]);

  assert.deepEqual(buildAreaServed(agency), [
    { "@type": "City", name: "Maurepas" },
    { "@type": "City", name: "Élancourt" },
    { "@type": "City", name: "Coignières" },
    { "@type": "City", name: "La Verrière" },
  ]);
});

test("network GEO accepts structured target city shapes and deduplicates safely", () => {
  assert.deepEqual(targetCityNames({
    ...agency,
    seoSite: {
      targetCities: {
        targets: [
          { name: "Élancourt" },
          { city: "Coignières" },
          { label: "La Verrière" },
          "elancourt",
        ],
      },
    },
  }), [
    "Maurepas",
    "Élancourt",
    "Coignières",
    "La Verrière",
  ]);
});

test("network GEO uses one stable Mondescale Organization", () => {
  const organization = buildMondescaleOrganization();
  const travelAgency = buildTravelAgency({
    agency,
    site,
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(organization["@id"], MONDESCALE_ORGANIZATION_ID);
  assert.deepEqual(travelAgency.parentOrganization, {
    "@id": MONDESCALE_ORGANIZATION_ID,
  });
  assert.equal(travelAgency.areaServed.length, 4);
});

test("canonical graph contains Organization, TravelAgency and explicit Person together", () => {
  const plan = buildStructuredDataPlan({
    sites: [site],
    publicOrigin: "https://agences.mondescale.com",
  });

  const graph = plan.items[0].graph["@graph"];
  assert.equal(graph.some((node) => node["@type"] === "Organization"), true);
  assert.equal(graph.some((node) => Array.isArray(node["@type"]) && node["@type"].includes("TravelAgency")), true);
  assert.equal(graph.some((node) => node["@type"] === "Person" && node.name === "Anisia"), true);
});

test("public mini-site contract projects SEO targetCities without leaking seoSite internals", () => {
  const canonicalSite = {
    targetCities: ["legacy-site-city"],
    agency: {
      id: 1,
      city: "Maurepas",
      seoSite: {
        targetCities: ["Élancourt", "Coignières"],
      },
    },
  };

  assert.deepEqual(publicTargetCities(canonicalSite), [
    "Élancourt",
    "Coignières",
  ]);
  assert.deepEqual(sanitizePublicAgency(canonicalSite.agency), {
    id: 1,
    city: "Maurepas",
  });
});

test("structured-data repository explicitly selects AgencySeoSite targetCities", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/minisite-structured-data/repository.js"),
    "utf8"
  );

  assert.match(source, /modelFields\("AgencySeoSite"\)/);
  assert.match(source, /"seoCity", "targetCities", "status", "updatedAt"/);
  assert.match(source, /seoSite:\s*\{\s*select:\s*agencySeoSiteSelect/);
});
