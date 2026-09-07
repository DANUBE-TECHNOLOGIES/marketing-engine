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
  preview,
  apply,
};
