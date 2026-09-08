const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  approvalTokenForReport,
  apply,
  buildReport,
  patchedContent,
} = require("../src/knowledge/network-team-backlink.service");

function source() {
  return {
    id: 1,
    name: "Mondescale Maurepas",
    seoSite: { slug: "maurepas" },
    agencySites: [
      {
        id: "site-1",
        pages: [
          {
            id: "page-1",
            status: "published",
            published: true,
            blocks: [
              {
                id: "block-1",
                blockType: "team",
                status: "published",
                content: {
                  heading: "Notre équipe",
                  members: [
                    { name: "Anisia", role: "Conseillère", bio: "Bio existante", custom: { keep: true }, knowledgeEntityId: "person-anisia" },
                    { name: "Alice", role: "Conseillère", bio: "Autre bio", custom: "keep-me" },
                    { name: "Sophie", role: "Conseillère" },
                  ],
                  untouched: { keep: "yes" },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function reconciliation() {
  return {
    tenantId: "tenant-1",
    tenantSlug: "mondescale",
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
            matchedEntity: { id: "person-anisia", status: "published", type: "person" },
          },
          {
            status: "canonical_match",
            name: "Alice",
            candidateSlug: "alice-maurepas",
            knowledgeEntityId: null,
            matchedEntity: { id: "person-alice", status: "published", type: "person" },
          },
          {
            status: "ambiguous",
            name: "Sophie",
            candidateSlug: "sophie-maurepas",
            knowledgeEntityId: null,
            matchedEntity: null,
          },
        ],
      },
    ],
  };
}

test("network backlink report patches only canonical exact Person links", async () => {
  const report = await buildReport({
    reconciliationLoader: async () => reconciliation(),
    sourceLoader: async () => [source()],
  });

  assert.equal(report.writes, false);
  assert.equal(report.destructive, false);
  assert.equal(report.summary.patchCount, 1);
  assert.equal(report.summary.noopCount, 1);
  assert.equal(report.summary.blockedCount, 1);
  assert.equal(report.eligible[0].name, "Alice");
  assert.equal(report.eligible[0].knowledgeEntityId, "person-alice");
  assert.equal(report.noop[0].name, "Anisia");
  assert.equal(report.blocked[0].name, "Sophie");
});

test("patch preserves every existing block and member field except knowledgeEntityId", () => {
  const block = source().agencySites[0].pages[0].blocks[0];
  const before = structuredClone(block.content);
  const next = patchedContent(block, {
    blockId: "block-1",
    collectionKey: "members",
    memberIndex: 1,
    name: "Alice",
    knowledgeEntityId: "person-alice",
  });

  assert.deepEqual(next.untouched, before.untouched);
  assert.equal(next.heading, before.heading);
  assert.deepEqual(next.members[0], before.members[0]);
  assert.equal(next.members[1].name, "Alice");
  assert.equal(next.members[1].role, "Conseillère");
  assert.equal(next.members[1].bio, "Autre bio");
  assert.equal(next.members[1].custom, "keep-me");
  assert.equal(next.members[1].knowledgeEntityId, "person-alice");
  assert.deepEqual(next.members[2], before.members[2]);
});

test("stale or missing backlink approval performs zero writes", async () => {
  const report = await buildReport({
    reconciliationLoader: async () => reconciliation(),
    sourceLoader: async () => [source()],
  });
  let writes = 0;

  await assert.rejects(
    () => apply({ reportLoader: async () => report, updateBlock: async () => { writes += 1; } }),
    /approbation explicite/
  );

  await assert.rejects(
    () => apply({
      approvalToken: "0".repeat(64),
      reportLoader: async () => report,
      updateBlock: async () => { writes += 1; },
    }),
    /ne correspond pas au rapport courant/
  );

  assert.equal(writes, 0);
});

test("safe backlink apply preflights then updates the exact PageBlock", async () => {
  const report = await buildReport({
    reconciliationLoader: async () => reconciliation(),
    sourceLoader: async () => [source()],
  });
  const updates = [];
  const block = source().agencySites[0].pages[0].blocks[0];

  const result = await apply({
    approvalToken: approvalTokenForReport(report),
    reportLoader: async () => report,
    blockLoader: async (id) => {
      assert.equal(id, "block-1");
      return block;
    },
    updateBlock: async (id, content) => {
      updates.push([id, content]);
    },
  });

  assert.equal(result.patchedCount, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0][0], "block-1");
  assert.equal(updates[0][1].members[1].knowledgeEntityId, "person-alice");
  assert.equal(updates[0][1].members[1].custom, "keep-me");
});

test("backlink routes use preview + approval token and expose no delete", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );
  assert.match(routes, /"\/team-backlink-preview"/);
  assert.match(routes, /"\/apply-team-backlinks"/);
  assert.match(routes, /approvalToken:\s*req\.body\?\.approvalToken/);
  assert.doesNotMatch(routes, /delete-team-backlinks/);
});
