"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildDiscoveryQueries,
  rankDiscoveryCandidates,
  scoreCandidate
} = require("./citation-discovery");

const agency = {
  id: 7,
  name: "Ambassade FRAM - Mondescale Nevers",
  address: "1 rue Exemple",
  postalCode: "58000",
  city: "Nevers",
  phone: "03 86 00 00 00",
  email: "nevers@example.fr",
  website: "https://agences.mondescale.com/nevers"
};

test("PagesJaunes discovery queries are deterministic and provider-scoped", () => {
  const queries = buildDiscoveryQueries(agency, "pagesjaunes");
  assert.equal(queries.length, 3);
  assert.ok(queries.every((query) => query.includes("site:pagesjaunes.fr")));
  assert.ok(queries[0].includes('"Ambassade FRAM - Mondescale Nevers"'));
  assert.ok(queries.some((query) => query.includes('"58000"')));
});

test("provider without configured public discovery domain yields no search query", () => {
  assert.deepEqual(buildDiscoveryQueries(agency, "google_business_profile"), []);
});

test("candidate ranking rejects cross-domain false positives", () => {
  const candidates = rankDiscoveryCandidates(agency, "pagesjaunes", [
    {
      url: "https://example.com/mondescale-nevers",
      title: "Ambassade FRAM - Mondescale Nevers"
    },
    {
      url: "https://www.pagesjaunes.fr/pros/123",
      title: "Ambassade FRAM - Mondescale Nevers - Nevers 58000"
    }
  ]);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, "https://www.pagesjaunes.fr/pros/123");
  assert.equal(candidates[0].score, 100);
});

test("weak same-domain candidate stays below automatic recording threshold", () => {
  const score = scoreCandidate({
    agency,
    providerKey: "pagesjaunes",
    url: "https://www.pagesjaunes.fr/pros/other-business",
    title: "Autre entreprise",
    description: "Annuaire professionnel"
  });
  assert.equal(score, 40);
});
