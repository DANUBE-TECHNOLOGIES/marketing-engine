"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  apply,
  networkApprovalToken,
  preview,
  validateAgencyOnlyPlan,
  validateNetworkApproval,
} = require("../src/knowledge/network-geo-apply.service");

function agencySource(id, slug, name, city) {
  return {
    id,
    tenantId: "tenant-1",
    name,
    city,
    seoSite: {
      id: `seo-${id}`,
      slug,
      seoCity: city,
      targetCities: [],
      status: "published",
    },
    agencySites: [],
  };
}

function reportFixture() {
  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: "tenant-1",
    tenantSlug: "mondescale",
    summary: {
      sourceAgencyCount: 3,
      eligibleAgencyCount: 2,
      blockedAgencyCount: 1,
      actionable: 1,
      noop: 1,
    },
    agencies: [
      {
        agencyId: 1,
        agencyName: "Mondescale Maurepas",
        siteSlug: "maurepas",
        actions: [
          {
            action: "noop_entity",
            ref: "agency:maurepas",
            entityId: "kg-maurepas",
          },
        ],
      },
      {
        agencyId: 2,
        agencyName: "Mondescale Dax",
        siteSlug: "dax",
        actions: [
          {
            action: "create_entity",
            ref: "agency:dax",
            entity: {
              type: "agency",
              slug: "mondescale-dax",
              title: "Mondescale Dax",
              status: "published",
              language: "fr",
              summary: "Agence de voyages Mondescale à Dax.",
            },
          },
        ],
      },
    ],
    blocked: [
      {
        agencyId: 3,
        agencyName: "Agence bloquée",
        reason: "canonical_seo_site_missing_or_incomplete",
      },
    ],
  };
}

test("network approval token is deterministic and covers blocked agencies", () => {
  const report = reportFixture();
  const first = networkApprovalToken(report);
  const second = networkApprovalToken(structuredClone(report));
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);

  const changed = structuredClone(report);
  changed.blocked[0].reason = "different_reason";
  assert.notEqual(networkApprovalToken(changed), first);
});

test("network preview returns server report and one global approval token", async () => {
  const report = reportFixture();
  const result = await preview({
    reportLoader: async ({ tenantSlug }) => {
      assert.equal(tenantSlug, "mondescale");
      return report;
    },
  });

  assert.equal(result.report, report);
  assert.equal(result.approvalToken, networkApprovalToken(report));
});

test("missing or stale global approval blocks the batch before writes", async () => {
  const report = reportFixture();
  let sourceReads = 0;
  let writes = 0;

  await assert.rejects(
    () => apply({
      reportLoader: async () => report,
      sourceLoader: async () => {
        sourceReads += 1;
        return [];
      },
      createEntity: async () => {
        writes += 1;
      },
      updateEntity: async () => {
        writes += 1;
      },
    }),
    /approbation explicite/
  );

  assert.equal(sourceReads, 0);
  assert.equal(writes, 0);

  const oldToken = networkApprovalToken(report);
  const changed = structuredClone(report);
  changed.agencies[1].actions[0].entity.title = "Titre modifié";

  await assert.rejects(
    () => apply({
      approvalToken: oldToken,
      reportLoader: async () => changed,
      sourceLoader: async () => {
        sourceReads += 1;
        return [];
      },
      createEntity: async () => {
        writes += 1;
      },
      updateEntity: async () => {
        writes += 1;
      },
    }),
    /ne correspond pas au rapport courant/
  );

  assert.equal(sourceReads, 0);
  assert.equal(writes, 0);
});

test("network apply revalidates each agency and writes only Agency entities", async () => {
  const report = reportFixture();
  const token = networkApprovalToken(report);
  const sources = [
    agencySource(1, "maurepas", "Mondescale Maurepas", "Maurepas"),
    agencySource(2, "dax", "Mondescale Dax", "Dax"),
  ];

  const snapshotCalls = [];
  const writes = [];

  const result = await apply({
    approvalToken: token,
    reportLoader: async () => structuredClone(report),
    sourceLoader: async (tenantId) => {
      assert.equal(tenantId, "tenant-1");
      return sources;
    },
    snapshotLoader: async (manifest) => {
      snapshotCalls.push(manifest.key);

      if (manifest.key === "network:maurepas") {
        return {
          existingEntities: [
            {
              id: "kg-maurepas",
              type: "agency",
              slug: "mondescale-maurepas",
              title: "Mondescale Maurepas",
              status: "published",
              language: "fr",
              summary: "Agence de voyages Mondescale à Maurepas.",
            },
          ],
          existingRelations: [],
        };
      }

      return {
        existingEntities: [],
        existingRelations: [],
      };
    },
    createEntity: async (entity) => {
      writes.push(["create", entity.type, entity.slug]);
      return { id: "kg-dax" };
    },
    updateEntity: async (id, entity) => {
      writes.push(["update", id, entity.type]);
      return { id };
    },
  });

  assert.equal(result.mode, "apply");
  assert.equal(result.destructive, false);
  assert.equal(result.appliedAgencyCount, 2);
  assert.equal(result.blocked.length, 1);
  assert.deepEqual(writes, [
    ["create", "agency", "mondescale-dax"],
  ]);
  assert.deepEqual(snapshotCalls, [
    "network:maurepas",
    "network:maurepas",
    "network:dax",
    "network:dax",
  ]);
});

test("network apply rejects Person, expertise and relations", () => {
  assert.throws(
    () => validateAgencyOnlyPlan({
      actions: [
        {
          action: "create_entity",
          entity: { type: "person" },
        },
      ],
    }),
    /limité aux entités agency/
  );

  assert.throws(
    () => validateAgencyOnlyPlan({
      actions: [
        {
          action: "create_relation",
          relationType: "works_at",
        },
      ],
    }),
    /Action interdite/
  );
});

test("network routes expose controlled preview/apply without delete", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );

  assert.match(routes, /"\/apply-preview"/);
  assert.match(routes, /router\.post\(\s*[\r\n ]*"\/apply-agencies"/);
  assert.match(routes, /approvalToken:\s*req\.body\?\.approvalToken/);
  assert.doesNotMatch(routes, /router\.delete\s*\(/);
});

test("validateNetworkApproval accepts only the exact current report token", () => {
  const report = reportFixture();
  const token = networkApprovalToken(report);
  assert.equal(validateNetworkApproval(report, token), true);
  assert.throws(
    () => validateNetworkApproval(report, "0".repeat(64)),
    /ne correspond pas au rapport courant/
  );
});
