"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MONDESCALE_ORGANIZATION_ID,
  buildAreaServed,
  buildMondescaleOrganization,
  buildTravelAgency,
  targetCityNames,
} = require("./travel-agency");

const agency = {
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
  slug: "maurepas",
};

test("GEO V1 keeps the agency city and adds only explicit target cities", () => {
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

test("GEO V1 accepts structured target city records without inferring missing facts", () => {
  const structured = {
    ...agency,
    seoSite: {
      targetCities: {
        cities: [
          { name: "Élancourt" },
          { city: "Coignières" },
          { label: "La Verrière" },
          { unexpected: "ignored" },
        ],
      },
    },
  };

  assert.deepEqual(targetCityNames(structured), [
    "Maurepas",
    "Élancourt",
    "Coignières",
    "La Verrière",
  ]);
});

test("GEO V1 links each agency to one canonical Mondescale organization", () => {
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
