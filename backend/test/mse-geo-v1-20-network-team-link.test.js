const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  approvalTokenForReport,
  apply,
  cloneWithKnowledgeLink,
  collectTeamOccurrences,
  hashValue,
  preview,
  report,
} = require("../src/knowledge/network-team-link.service");

const updatedAt = new Date("2026-09-08T05:00:00.000Z");

function source() {
  return {
    id: 1,
    tenantId: "tenant-1",
    name: "Mondescale Maurepas",
    city: "Maurepas",
    seoSite: {
      slug: "maurepas",
      seoCity: "Maurepas",
    },
    agencySites: [
      {
        id: "site-1",
        slug: "maurepas",
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
                updatedAt,
                content: {
                  heading: "Notre équipe",
                  members: [
                    {
                      name: "Anisia",
                      role: "Conseillère",
                      bio: "Bienvenue à Maurepas",
                      imageUrl: "/anisia.jpg",
                    },
                    {
                      name: "Alice",
                      role: "Conseillère",
                      knowledgeEntityId: "person-alice",
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function people() {
  return [
    {
      id: "person-anisia",
      type: "person",
      slug: "anisia-maurepas",
      title: "Anisia",
      status: "published",
      language: "fr",
    },
    {
      id: "person-alice",
      type: "person",
      slug: "alice-maurepas",
      title: "Alice",
      status: "published",
      language: "fr",
    },
  ];
}

test("team occurrence locator is exact block + collection + index", () => {
  const occurrences = collectTeamOccurrences(source());
  assert.equal(occurrences.length, 2);
  assert.deepEqual(
    occurrences.map((item) => [item.blockId, item.collectionKey, item.memberIndex, item.name]),
    [
      ["block-1", "members", 0, "Anisia"],
      ["block-1", "members", 1, "Alice"],
    ]
  );
  assert.match(occurrences[0].memberHash, /^[a-f0-9]{64}$/);
  assert.match(occurrences[0].blockHash, /^[a-f0-9]{64}$/);
});

test("network report links only exact canonical published Person and keeps explicit valid link as noop", async () => {
  const result = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => [source()],
    peopleLoader: async () => people(),
  });

  assert.equal(result.summary.occurrenceCount, 2);
  assert.equal(result.summary.linkRequiredCount, 1);
  assert.equal(result.summary.noopCount, 1);
  assert.equal(result.summary.blockedCount, 0);
  assert.equal(result.linkRequired[0].name, "Anisia");
  assert.equal(result.linkRequired[0].expectedKnowledgeEntityId, "person-anisia");
  assert.equal(result.noop[0].name, "Alice");
});

test("missing exact canonical Person is blocked and never guessed by name", async () => {
  const result = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => [source()],
    peopleLoader: async () => [people()[1]],
  });

  assert.equal(result.summary.linkRequiredCount, 0);
  assert.equal(result.summary.blockedCount, 1);
  assert.equal(result.blocked[0].name, "Anisia");
  assert.equal(result.blocked[0].reason, "canonical_person_missing_or_not_published");
});

test("preview token covers exact locators and block/member fingerprints", async () => {
  const value = await preview({
    tenantId: "tenant-1",
    sourceLoader: async () => [source()],
    peopleLoader: async () => people(),
  });

  assert.match(value.approvalToken, /^[a-f0-9]{64}$/);
  assert.equal(value.approvalToken, approvalTokenForReport(value.report));

  const changed = structuredClone(value.report);
  changed.linkRequired[0].memberIndex = 9;
  assert.notEqual(approvalTokenForReport(changed), value.approvalToken);
});

test("link mutation preserves every existing member field and adds only knowledgeEntityId", () => {
  const content = source().agencySites[0].pages[0].blocks[0].content;
  const item = {
    collectionKey: "members",
    memberIndex: 0,
    expectedKnowledgeEntityId: "person-anisia",
  };
  const next = cloneWithKnowledgeLink(content, item);

  assert.deepEqual(next.members[0], {
    ...content.members[0],
    knowledgeEntityId: "person-anisia",
  });
  assert.deepEqual(next.members[1], content.members[1]);
  assert.equal(next.heading, content.heading);
  assert.equal("knowledgeEntityId" in content.members[0], false);
});

test("missing approval performs zero report read and zero transaction", async () => {
  let reads = 0;
  let transactions = 0;

  await assert.rejects(
    () => apply({
      reportLoader: async () => {
        reads += 1;
        return {};
      },
      prismaClient: {
        $transaction: async () => {
          transactions += 1;
        },
      },
    }),
    /approbation explicite/
  );

  assert.equal(reads, 0);
  assert.equal(transactions, 0);
});

test("stale block during transaction preflight yields zero PageBlock updates", async () => {
  const current = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => [source()],
    peopleLoader: async () => people(),
  });
  let updates = 0;
  const staleContent = structuredClone(source().agencySites[0].pages[0].blocks[0].content);
  staleContent.members[0].bio = "Contenu modifié après preview";

  await assert.rejects(
    () => apply({
      approvalToken: approvalTokenForReport(current),
      reportLoader: async () => current,
      prismaClient: {
        $transaction: async (callback) => callback({
          pageBlock: {
            findUnique: async () => ({
              id: "block-1",
              content: staleContent,
              updatedAt,
              page: { site: { tenantId: "tenant-1", agencyId: 1 } },
            }),
            update: async () => {
              updates += 1;
            },
          },
          knowledgeEntity: {
            findUnique: async () => ({ id: "person-anisia", type: "person", status: "published" }),
          },
        }),
      },
    }),
    /a changé depuis le preview/
  );

  assert.equal(updates, 0);
});

test("all locators are preflighted before first update", async () => {
  const first = source();
  first.agencySites[0].pages[0].blocks.push({
    id: "block-2",
    blockType: "team",
    status: "published",
    updatedAt,
    content: {
      members: [{ name: "Bob" }],
    },
  });
  const current = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => [first],
    peopleLoader: async () => [
      ...people(),
      { id: "person-bob", type: "person", slug: "bob-maurepas", title: "Bob", status: "published", language: "fr" },
    ],
  });

  let updates = 0;
  const blocks = Object.fromEntries(
    first.agencySites[0].pages[0].blocks.map((block) => [block.id, block])
  );

  await assert.rejects(
    () => apply({
      approvalToken: approvalTokenForReport(current),
      reportLoader: async () => current,
      prismaClient: {
        $transaction: async (callback) => callback({
          pageBlock: {
            findUnique: async ({ where }) => {
              const block = blocks[where.id];
              if (where.id === "block-2") {
                return {
                  id: block.id,
                  content: { members: [{ name: "Robert" }] },
                  updatedAt: block.updatedAt,
                  page: { site: { tenantId: "tenant-1", agencyId: 1 } },
                };
              }
              return {
                id: block.id,
                content: block.content,
                updatedAt: block.updatedAt,
                page: { site: { tenantId: "tenant-1", agencyId: 1 } },
              };
            },
            update: async () => {
              updates += 1;
            },
          },
          knowledgeEntity: {
            findUnique: async ({ where }) => ({ id: where.id, type: "person", status: "published" }),
          },
        }),
      },
    }),
    /a changé depuis le preview/
  );

  assert.equal(updates, 0);
});

test("successful apply groups multiple links per block and writes once", async () => {
  const base = source();
  base.agencySites[0].pages[0].blocks[0].content.members[1].knowledgeEntityId = undefined;
  const current = await report({
    tenantId: "tenant-1",
    sourceLoader: async () => [base],
    peopleLoader: async () => people(),
  });
  assert.equal(current.summary.linkRequiredCount, 2);

  const writes = [];
  const block = base.agencySites[0].pages[0].blocks[0];
  const result = await apply({
    approvalToken: approvalTokenForReport(current),
    reportLoader: async () => current,
    prismaClient: {
      $transaction: async (callback) => callback({
        pageBlock: {
          findUnique: async () => ({
            id: block.id,
            content: block.content,
            updatedAt: block.updatedAt,
            page: { site: { tenantId: "tenant-1", agencyId: 1 } },
          }),
          update: async ({ where, data }) => {
            writes.push({ where, data });
            return { id: where.id };
          },
        },
        knowledgeEntity: {
          findUnique: async ({ where }) => ({ id: where.id, type: "person", status: "published" }),
        },
      }),
    },
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0].data.content.members[0].knowledgeEntityId, "person-anisia");
  assert.equal(writes[0].data.content.members[1].knowledgeEntityId, "person-alice");
  assert.equal(writes[0].data.content.members[0].bio, "Bienvenue à Maurepas");
  assert.equal(result.updatedBlockCount, 1);
  assert.equal(result.linkedOccurrenceCount, 2);
});

test("routes expose controlled team link preview/apply and no delete", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );
  assert.match(routes, /"\/team-link-preview"/);
  assert.match(routes, /"\/apply-team-links"/);
  assert.match(routes, /approvalToken:\s*req\.body\?\.approvalToken/);
  assert.doesNotMatch(routes, /delete-team-links/);
});

test("network source loader requests PageBlock updatedAt for optimistic preconditions", () => {
  const sourceCode = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.service.js"),
    "utf8"
  );
  assert.match(sourceCode, /blockType:\s*true[\s\S]*content:\s*true[\s\S]*status:\s*true[\s\S]*updatedAt:\s*true/);
  assert.match(hashValue({ b: 2, a: 1 }), /^[a-f0-9]{64}$/);
});
