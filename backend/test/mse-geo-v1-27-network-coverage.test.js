const test = require("node:test");
const assert = require("node:assert/strict");

const { coverageFromMatrices, report } = require("../src/knowledge/network-coverage.service");

function agencyMatrix() {
  return {
    agencies: [
      {
        agency: { id: "a1", slug: "mondescale-maurepas", title: "Mondescale Maurepas" },
        relations: [
          { relationType: "recommends", target: { id: "d1", slug: "sicile", title: "Sicile", type: "destination" } },
          { relationType: "available_in", target: { id: "c1", slug: "seychelles", title: "Croisière Seychelles", type: "cruise" } },
        ],
      },
      {
        agency: { id: "a2", slug: "mondescale-gien", title: "Mondescale Gien" },
        relations: [],
      },
    ],
  };
}

function expertiseMatrix() {
  return {
    people: [
      {
        person: { id: "p1", slug: "anisia-maurepas", title: "Anisia" },
        agency: { id: "a1", slug: "mondescale-maurepas", title: "Mondescale Maurepas" },
        expertises: [{ id: "e1", slug: "circuits", title: "Circuits" }],
      },
      {
        person: { id: "p2", slug: "marie-claire-gien", title: "Marie-Claire" },
        agency: { id: "a2", slug: "mondescale-gien", title: "Mondescale Gien" },
        expertises: [],
      },
      {
        person: { id: "p3", slug: "orphelin", title: "Profil sans agence" },
        agency: null,
        expertises: [],
        blockedReason: "published_agency_works_at_missing",
      },
    ],
  };
}

test("coverage aggregates only explicit Agency and Person Knowledge facts", () => {
  const result = coverageFromMatrices({ agencyMatrix: agencyMatrix(), expertiseMatrix: expertiseMatrix() });

  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.inference, false);
  assert.equal(result.summary.agencyCount, 2);
  assert.equal(result.summary.explicitAgencyKnowledgeFactCount, 2);
  assert.equal(result.summary.explicitExpertiseCount, 1);
  assert.equal(result.summary.agenciesWithoutAgencyKnowledge, 1);
  assert.equal(result.summary.peopleWithoutExpertise, 1);
  assert.equal(result.summary.peopleWithoutAgency, 1);
});

test("missing Agency facts and Person expertise are surfaced but never fabricated", () => {
  const result = coverageFromMatrices({ agencyMatrix: agencyMatrix(), expertiseMatrix: expertiseMatrix() });
  const gien = result.agencies.find((row) => row.agency.id === "a2");
  const maurepas = result.agencies.find((row) => row.agency.id === "a1");

  assert.deepEqual(gien.exceptions, ["agency_recommends_or_features_missing", "person_expertise_missing"]);
  assert.equal(gien.peopleWithoutExpertise[0].title, "Marie-Claire");
  assert.deepEqual(maurepas.exceptions, []);
  assert.equal(result.peopleWithoutAgency[0].title, "Profil sans agence");
});

test("target coverage counts exact Agency relations and preserves relation types", () => {
  const result = coverageFromMatrices({ agencyMatrix: agencyMatrix(), expertiseMatrix: expertiseMatrix() });
  const sicile = result.targets.find((target) => target.id === "d1");
  const seychelles = result.targets.find((target) => target.id === "c1");

  assert.equal(sicile.agencyCount, 1);
  assert.deepEqual(sicile.relationTypes, ["recommends"]);
  assert.equal(seychelles.agencyCount, 1);
  assert.deepEqual(seychelles.relationTypes, ["available_in"]);
});

test("report is read-only aggregation over existing validated matrices", async () => {
  let agencyReads = 0;
  let expertiseReads = 0;
  const result = await report({
    agencyMatrixLoader: async () => { agencyReads += 1; return agencyMatrix(); },
    expertiseMatrixLoader: async () => { expertiseReads += 1; return expertiseMatrix(); },
  });

  assert.equal(agencyReads, 1);
  assert.equal(expertiseReads, 1);
  assert.equal(result.destructive, false);
  assert.equal(result.providerCall, false);
});
