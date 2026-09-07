const manifest = require("./pilots/maurepas.manifest");
const knowledgeService = require("./knowledge.service");
const knowledgeRelationService = require("./knowledge-relation.service");
const {
  loadKnowledgeSnapshot,
} = require("./knowledge-pilot-readonly");
const {
  buildKnowledgePilotPlan,
} = require("./pilot-planner");
const {
  applyKnowledgePilotPlan,
  approvalTokenForPlan,
} = require("./pilot-apply");

async function buildCurrentPlan({
  snapshotLoader = loadKnowledgeSnapshot,
} = {}) {
  const snapshot = await snapshotLoader(manifest);

  return buildKnowledgePilotPlan({
    manifest,
    existingEntities: snapshot.existingEntities,
    existingRelations: snapshot.existingRelations,
  });
}

function summarizePlan(plan) {
  const summary = {
    entity: {
      missing: 0,
      updateRequired: 0,
      compliant: 0,
    },
    relation: {
      missing: 0,
      compliant: 0,
    },
    actionable: 0,
    noop: 0,
  };

  for (const action of plan?.actions || []) {
    switch (action.action) {
      case "create_entity":
        summary.entity.missing += 1;
        summary.actionable += 1;
        break;
      case "update_entity":
        summary.entity.updateRequired += 1;
        summary.actionable += 1;
        break;
      case "noop_entity":
        summary.entity.compliant += 1;
        summary.noop += 1;
        break;
      case "create_relation":
        summary.relation.missing += 1;
        summary.actionable += 1;
        break;
      case "noop_relation":
        summary.relation.compliant += 1;
        summary.noop += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

async function report({
  snapshotLoader = loadKnowledgeSnapshot,
} = {}) {
  const plan = await buildCurrentPlan({ snapshotLoader });

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    manifestKey: manifest.key || null,
    language: manifest.language || "fr",
    expertiseValidated: Array.isArray(manifest.expertise)
      ? manifest.expertise.length
      : 0,
    expertInPlanned: (plan.actions || []).some(
      (action) => action.relationType === "expert_in"
    ),
    summary: summarizePlan(plan),
    actions: plan.actions || [],
  };
}

async function preview({
  snapshotLoader = loadKnowledgeSnapshot,
} = {}) {
  const plan = await buildCurrentPlan({ snapshotLoader });

  return {
    manifestKey: manifest.key || null,
    plan,
    approvalToken: approvalTokenForPlan(plan),
  };
}

async function apply({
  approvalToken,
  snapshotLoader = loadKnowledgeSnapshot,
  createEntity = (entity) => knowledgeService.create(entity),
  updateEntity = (id, entity) => knowledgeService.update(id, entity),
  createRelation = (sourceId, payload) =>
    knowledgeRelationService.create(sourceId, payload),
} = {}) {
  const approvedPlan = await buildCurrentPlan({
    snapshotLoader,
  });

  return applyKnowledgePilotPlan({
    plan: approvedPlan,
    approvalToken,
    allowExpertise: false,
    rebuildCurrentPlan: () =>
      buildCurrentPlan({ snapshotLoader }),
    createEntity,
    updateEntity,
    createRelation,
  });
}

module.exports = {
  buildCurrentPlan,
  summarizePlan,
  report,
  preview,
  apply,
};
