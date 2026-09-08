const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  approvalTokenForReport,
  apply,
  buildApplyReport,
  hasWorksAt,
  personPayload,
  preview,
} = require("../src/knowledge/network-person-apply.service");

function sourceReport() {
  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: "tenant-1",
    tenantSlug: "mondescale",
    summary: {
      explicitMemberCount: 4,
    },
    agencies: [
      {
        agencyId: 1,
        agencyName: "Mondescale Maurepas",
        siteSlug: "maurepas",
        members: [
          {
            status: "linked",
            name: "Anisia",
            candidateSlug: "anisia-maurepas",
            knowledgeEntityId: "person-anisia",
            matchedEntity: {
              id: "person-anisia",
              type: "person",
              status: "published",
            },
            reason: "explicit_knowledge_entity_id",
          },
          {
            status: "new_candidate",
            name: "Alice",
            candidateSlug: "alice-maurepas",
            knowledgeEntityId: null,
            matchedEntity: null,
            reason: "no_existing_person_conflict",
          },
          {
            status: "ambiguous",
            name: "Sophie",
            candidateSlug: "sophie-maurepas",
            knowledgeEntityId: null,
            matchedEntity: null,
            reason: "same_normalized_title_exists_under_other_slug",
          },
        ],
      },
      {
        agencyId: 2,
        agencyName: "Mondescale Dax",
        siteSlug: "dax",
        members: [
          {
            status: "canonical_match",
            name: "Sylvie",
            candidateSlug: "sylvie-dax",
            knowledgeEntityId: null,
            matchedEntity: {
              id: "person-sylvie",
              type: "person",
              status: "published",
            },
            reason: "exact_canonical_slug_language",
          },
        ],
      },
    ],
  };
}

function agencyLookup(slug) {
  const map = {
    "mondescale-maurepas": {
      id: "agency-maurepas",
      type: "agency",
      status: "published",
      slug: "mondescale-maurepas",
    },
    "mondescale-dax": {
      id: "agency-dax",
      type: "agency",
      status: "published",
      slug: "mondescale-dax",
    },
  };
  return map[slug] || null;
}

function details() {
  return {
    "person-anisia": {
      id: "person-anisia",
      type: "person",
      status: "published",
      outgoingRelations: [
        {
          relationType: "works_at",
          targetId: "agency-maurepas",
        },
      ],
    },
    "person-sylvie": {
      id: "person-sylvie",
      type: "person",
      status: "published",
      outgoingRelations: [],
    },
  };
}

test("Person apply report keeps ambiguous profiles out of the batch", async () => {
  const report = await buildApplyReport({
    reconciliationLoader: async () => sourceReport(),
    entityLookup: async (slug) => agencyLookup(slug),
    detailLookup: async (id) => details()[id] || null,
  });

  assert.equal(report.summary.explicitMemberCount, 4);
  assert.equal(report.summary.eligibleCount, 3);
  assert.equal(report.summary.blockedCount, 1);
  assert.equal(report.summary.createPersonCount, 1);
  assert.equal(report.summary.createWorksAtCount, 1);
  assert.equal(report.summary.noopCount, 1);
  assert.equal(report.blocked[0].name, "Sophie");
  assert.equal(report.blocked[0].action, "blocked");
  assert.equal(report.eligible.some((item) => item.name === "Sophie"), false);
});

test("Person apply report blocks profiles when canonical Agency is absent", async () => {
  const source = sourceReport();
  source.agencies = [source.agencies[1]];

  const report = await buildApplyReport({
    reconciliationLoader: async () => source,
    entityLookup: async () => null,
    detailLookup: async () => details()["person-sylvie"],
  });

  assert.equal(report.summary.eligibleCount, 0);
  assert.equal(report.summary.blockedCount, 1);
  assert.equal(report.blocked[0].reason, "canonical_agency_missing_or_not_published");
});

test("preview returns one deterministic token over eligible and blocked Person states", async () => {
  const options = {
    reconciliationLoader: async () => sourceReport(),
    entityLookup: async (slug) => agencyLookup(slug),
    detailLookup: async (id) => details()[id] || null,
  };

  const first = await preview(options);
  const second = await preview(options);

  assert.match(first.approvalToken, /^[a-f0-9]{64}$/);
  assert.equal(first.approvalToken, second.approvalToken);
  assert.equal(first.approvalToken, approvalTokenForReport(first.report));
});

test("missing approval performs zero report read and zero writes", async () => {
  let reads = 0;
  let writes = 0;

  await assert.rejects(
    () => apply({
      reportLoader: async () => {
        reads += 1;
        return {};
      },
      createEntity: async () => {
        writes += 1;
      },
      createRelation: async () => {
        writes += 1;
      },
    }),
    /approbation explicite/
  );

  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test("stale token blocks all writes", async () => {
  const current = {
    tenantId: "tenant-1",
    tenantSlug: "mondescale",
    eligible: [],
    blocked: [],
  };
  let writes = 0;

  await assert.rejects(
    () => apply({
      approvalToken: "0".repeat(64),
      reportLoader: async () => current,
      createEntity: async () => {
        writes += 1;
      },
      createRelation: async () => {
        writes += 1;
      },
    }),
    /ne correspond pas au rapport courant/
  );

  assert.equal(writes, 0);
});

test("one stale member during preflight blocks the entire batch before writes", async () => {
  const current = {
    tenantId: "tenant-1",
    tenantSlug: "mondescale",
    eligible: [
      {
        agencyId: 1,
        agencyName: "Maurepas",
        siteSlug: "maurepas",
        name: "Alice",
        status: "new_candidate",
        candidateSlug: "alice-maurepas",
        personId: null,
        agencyKnowledgeId: "agency-maurepas",
        action: "create_person_and_works_at",
        reason: "no_existing_person_conflict",
      },
      {
        agencyId: 2,
        agencyName: "Dax",
        siteSlug: "dax",
        name: "Sylvie",
        status: "canonical_match",
        candidateSlug: "sylvie-dax",
        personId: "person-sylvie",
        agencyKnowledgeId: "agency-dax",
        action: "create_works_at",
        reason: "exact_canonical_slug_language",
      },
    ],
    blocked: [],
  };
  let writes = 0;

  const reconciliationLoader = async ({ peopleLoader }) => {
    if (peopleLoader) {
      return {
        ...sourceReport(),
        agencies: [
          sourceReport().agencies[0],
          {
            ...sourceReport().agencies[1],
            members: [
              {
                ...sourceReport().agencies[1].members[0],
                status: "ambiguous",
              },
            ],
          },
        ],
      };
    }
    return sourceReport();
  };

  await assert.rejects(
    () => apply({
      approvalToken: approvalTokenForReport(current),
      reportLoader: async () => current,
      reconciliationLoader,
      peopleLoader: async () => [],
      entityLookup: async (slug) => agencyLookup(slug),
      detailLookup: async (id) => details()[id] || null,
      createEntity: async () => {
        writes += 1;
        return { id: "person-alice" };
      },
      createRelation: async () => {
        writes += 1;
      },
    }),
    /a changé depuis le preview/
  );

  assert.equal(writes, 0);
});

test("safe batch creates only new Person and missing works_at relations", async () => {
  const current = await buildApplyReport({
    reconciliationLoader: async () => sourceReport(),
    entityLookup: async (slug) => agencyLookup(slug),
    detailLookup: async (id) => details()[id] || null,
  });

  const writes = [];
  const dynamicDetails = { ...details() };

  const result = await apply({
    approvalToken: approvalTokenForReport(current),
    reportLoader: async () => current,
    reconciliationLoader: async () => sourceReport(),
    peopleLoader: async () => [],
    entityLookup: async (slug) => agencyLookup(slug),
    detailLookup: async (id) => dynamicDetails[id] || null,
    createEntity: async (payload) => {
      assert.deepEqual(payload, {
        type: "person",
        slug: "alice-maurepas",
        title: "Alice",
        status: "published",
        language: "fr",
        summary: null,
      });
      writes.push(["create_person", payload.slug]);
      dynamicDetails["person-alice"] = {
        id: "person-alice",
        type: "person",
        status: "published",
        outgoingRelations: [],
      };
      return { id: "person-alice" };
    },
    createRelation: async (sourceId, payload) => {
      assert.equal(payload.relationType, "works_at");
      writes.push(["works_at", sourceId, payload.targetId]);
      dynamicDetails[sourceId].outgoingRelations.push({
        relationType: "works_at",
        targetId: payload.targetId,
      });
      return { id: `rel-${sourceId}` };
    },
  });

  assert.deepEqual(writes, [
    ["create_person", "alice-maurepas"],
    ["works_at", "person-alice", "agency-maurepas"],
    ["works_at", "person-sylvie", "agency-dax"],
  ]);
  assert.equal(result.appliedCount, 2);
  assert.equal(result.noopCount, 1);
  assert.equal(result.blocked.length, 1);
});

test("helpers never introduce expertise or role claims", () => {
  const payload = personPayload({
    name: "Alice",
    candidateSlug: "alice-maurepas",
  });
  assert.equal(payload.type, "person");
  assert.equal(payload.summary, null);
  assert.equal("expertise" in payload, false);
  assert.equal("role" in payload, false);
  assert.equal(hasWorksAt({ outgoingRelations: [] }, "agency-1"), false);
});

test("network routes expose controlled Person preview/apply and no Person delete", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );

  assert.match(routes, /"\/people-apply-preview"/);
  assert.match(routes, /"\/apply-people"/);
  assert.match(routes, /approvalToken:\s*req\.body\?\.approvalToken/);
  assert.doesNotMatch(routes, /delete-people/);
});
