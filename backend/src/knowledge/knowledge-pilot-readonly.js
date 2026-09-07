const knowledgeRepository = require("./knowledge.repository");

function relationKey(sourceId, targetId, relationType) {
  return `${sourceId}::${targetId}::${relationType}`;
}

async function loadKnowledgeSnapshot(manifest, {
  repository = knowledgeRepository,
} = {}) {
  const language = manifest.language || "fr";
  const entitiesByRef = {};
  const existingEntities = [];
  const existingRelations = [];

  for (const entity of manifest.entities || []) {
    const current = await repository.findBySlugAndLanguage(
      entity.slug,
      entity.language || language
    );

    entitiesByRef[entity.ref] = current || null;

    if (current) {
      existingEntities.push(current);
    }
  }

  for (const relation of manifest.relations || []) {
    const source = entitiesByRef[relation.sourceRef];
    const target = entitiesByRef[relation.targetRef];

    if (!source || !target) {
      continue;
    }

    const detailedSource = await repository.findById(source.id);
    const exists = Boolean(
      detailedSource?.outgoingRelations?.some(
        (candidate) =>
          relationKey(
            candidate.sourceId,
            candidate.targetId,
            candidate.relationType
          ) ===
          relationKey(source.id, target.id, relation.relationType)
      )
    );

    if (exists) {
      existingRelations.push({
        sourceId: source.id,
        targetId: target.id,
        relationType: relation.relationType,
      });
    }
  }

  return {
    entitiesByRef,
    existingEntities,
    existingRelations,
  };
}

module.exports = {
  loadKnowledgeSnapshot,
};
