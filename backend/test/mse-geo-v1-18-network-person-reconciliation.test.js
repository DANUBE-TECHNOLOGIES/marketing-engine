"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canonicalPersonSlug,
  classifyMember,
  indexes,
  report,
} = require("../src/knowledge/network-person-reconciliation.service");

function source(id, slug, name, members) {
  return {
    id,
    name,
    city: name.replace(/^Mondescale /, ""),
    seoSite: {
      id: `seo-${id}`,
      slug,
      seoCity: name.replace(/^Mondescale /, ""),
      targetCities: [],
      status: "published",
    },
    agencySites: [
      {
        id: `site-${id}`,
        slug,
        status: "published",
        pages: [
          {
            id: `page-${id}`,
            slug: "equipe",
            status: "published",
            published: true,
            blocks: [
              {
                id: `team-${id}`,
                blockType: "team",
                status: "published",
                content: { members },
              },
            ],
          },
        ],
      },
    ],
  };
}

const people = [
  {
    id: "kg-anisia",
    type: "person",
    slug: "anisia-maurepas",
    title: "Anisia",
    status: "published",
    language: "fr",
  },
  {
    id: "kg-sylvie-dax",
    type: "person",
    slug: "sylvie-dax",
    title: "Sylvie",
    status: "published",
    language: "fr",
  },
  {
    id: "kg-marie-other",
    type: "person",
    slug: "marie-autre-agence",
    title: "Marie",
    status: "draft",
    language: "fr",
  },
];

test("canonical Person slug is deterministic from explicit name and agency slug", () => {
  assert.equal(canonicalPersonSlug("Marie-Claire", "gien"), "marie-claire-gien");
  assert.equal(canonicalPersonSlug("Anisia", "maurepas"), "anisia-maurepas");
});

test("explicit Knowledge id wins only when it resolves to an existing Person", () => {
  const peopleIndex = indexes(people);
  const linked = classifyMember({
    member: { name: "Anisia", knowledgeEntityId: "kg-anisia" },
    agencySlug: "maurepas",
    peopleIndex,
  });
  assert.equal(linked.status, "linked");
  assert.equal(linked.reason, "explicit_knowledge_entity_id");

  const invalid = classifyMember({
    member: { name: "Anisia", knowledgeEntityId: "missing-id" },
    agencySlug: "maurepas",
    peopleIndex,
  });
  assert.equal(invalid.status, "ambiguous");
  assert.equal(invalid.reason, "explicit_link_missing_or_not_person");
});

test("exact canonical slug+language is a candidate without fuzzy matching", () => {
  const result = classifyMember({
    member: { name: "Sylvie" },
    agencySlug: "dax",
    peopleIndex: indexes(people),
  });

  assert.equal(result.status, "canonical_match");
  assert.equal(result.matchedEntity.id, "kg-sylvie-dax");
  assert.equal(result.reason, "exact_canonical_slug_language");
});

test("same normalized title under another slug blocks creation but never links", () => {
  const result = classifyMember({
    member: { name: "Marie" },
    agencySlug: "gien",
    peopleIndex: indexes(people),
  });

  assert.equal(result.status, "ambiguous");
  assert.equal(result.matchedEntity, null);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].id, "kg-marie-other");
});

test("new explicit member becomes a new candidate only when no Person conflicts", () => {
  const result = classifyMember({
    member: { name: "Prescillia" },
    agencySlug: "ozoir-la-ferriere",
    peopleIndex: indexes(people),
  });

  assert.equal(result.status, "new_candidate");
  assert.equal(result.candidateSlug, "prescillia-ozoir-la-ferriere");
  assert.equal(result.reason, "no_existing_person_conflict");
});

test("one read-only network pass classifies members across all agencies", async () => {
  const sources = [
    source(1, "maurepas", "Mondescale Maurepas", [
      { name: "Anisia", knowledgeEntityId: "kg-anisia" },
    ]),
    source(2, "dax", "Mondescale Dax", [
      { name: "Sylvie" },
    ]),
    source(3, "gien", "Mondescale Gien", [
      { name: "Marie" },
      { name: "Nouveau Profil" },
    ]),
  ];

  const result = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => sources,
    peopleLoader: async () => people,
  });

  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.summary.agencyCount, 3);
  assert.equal(result.summary.explicitMemberCount, 4);
  assert.equal(result.summary.linked, 1);
  assert.equal(result.summary.canonicalMatch, 1);
  assert.equal(result.summary.ambiguous, 1);
  assert.equal(result.summary.newCandidate, 1);
});
