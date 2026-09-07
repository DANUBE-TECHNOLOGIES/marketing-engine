const knowledgeRepository = require("./knowledge.repository");

function relationKey(sourceId, targetId, relationType) {
  return `${sourceId}::${targetId}::${relationType}`;
}

async function loadKnowledgeSnapshot(manifest, {
  repository = knowledgeRepository,
} = {}) {
  const entitiesByManifestKey = {};
  const relations = [];

  for (const entity of manifest.entities || []) {
    const current = await repository.findBySlugAndLanguage(
      entity.slug,
      entity.language
    );

    entitiesByManifestKey[entity.key] = current || null;
  }

  for (const relation of manifest.relations || []) {
    const source = entitiesByManifestKey[relation.sourceKey];
    const target = entitiesByManifestKey[relation.targetKey];

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
      relations.push({
        sourceId: source.id,
        targetId: target.id,
        relationType: relation.relationType,
      });
    }
  }

  return {
    entitiesByManifestKey,
    relations,
  };
}

module.exports = {
  loadKnowledgeSnapshot,
};
