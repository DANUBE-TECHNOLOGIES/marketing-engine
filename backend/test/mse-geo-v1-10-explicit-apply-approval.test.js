const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyKnowledgePilotPlan,
  approvalTokenForPlan,
  validateApprovalToken,
} = require("../src/knowledge/pilot-apply");

function plan() {
  return {
    mode: "dry-run",
    destructive: false,
    manifestKey: "maurepas-v1",
    actions: [
      {
        action: "create_entity",
        ref: "agency:maurepas",
        entity: {
          type: "agency",
          slug: "mondescale-maurepas",
          title: "Mondescale Maurepas",
          status: "published",
          language: "fr",
          summary: "Agence de voyages Mondescale à Maurepas.",
        },
      },
    ],
  };
}

test("approval token is deterministic for the exact dry-run plan", () => {
  const current = plan();
  const first = approvalTokenForPlan(current);
  const second = approvalTokenForPlan(structuredClone(current));

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.equal(validateApprovalToken(current, first), true);
});

test("any material plan change invalidates prior approval", () => {
  const approved = plan();
  const token = approvalTokenForPlan(approved);
  const changed = structuredClone(approved);
  changed.actions[0].entity.title = "Mondescale Maurepas modifié";

  assert.notEqual(approvalTokenForPlan(changed), token);
  assert.throws(
    () => validateApprovalToken(changed, token),
    /ne correspond pas au plan/
  );
});

test("apply refuses missing or invalid approval before any snapshot read or write", async () => {
  const current = plan();
  let reads = 0;
  let writes = 0;

  await assert.rejects(
    () => applyKnowledgePilotPlan({
      plan: current,
      rebuildCurrentPlan: async () => {
        reads += 1;
        return structuredClone(current);
      },
      createEntity: async () => {
        writes += 1;
        return { id: "unexpected" };
      },
    }),
    /approbation explicite/
  );

  await assert.rejects(
    () => applyKnowledgePilotPlan({
      plan: current,
      approvalToken: "0".repeat(64),
      rebuildCurrentPlan: async () => {
        reads += 1;
        return structuredClone(current);
      },
      createEntity: async () => {
        writes += 1;
        return { id: "unexpected" };
      },
    }),
    /ne correspond pas au plan/
  );

  assert.equal(reads, 0);
  assert.equal(writes, 0);
});
