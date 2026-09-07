function normalize(value) {
  return String(value || "").trim();
}

function entityKey(entity) {
  return `${normalize(entity.language || "fr")}:${normalize(entity.slug)}`;
}

function comparableEntity(entity) {
  return {
    type: normalize(entity.type),
    slug: normalize(entity.slug),
    title: normalize(entity.title),
    status: normalize(entity.status),
    language: normalize(entity.language || "fr"),
    summary: entity.summary == null ? null : normalize(entity.summary),
  };
}

function sameEntity(a, b) {
  return JSON.stringify(comparableEntity(a)) === JSON.stringify(comparableEntity(b));
}

function relationKey(relation) {
  return [
    normalize(relation.sourceId),
    normalize(relation.targetId),
    normalize(relation.relationType),
  ].join(":");
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.entities) || !Array.isArray(manifest.relations)) {
    throw new Error("Knowledge pilot manifest invalide.");
  }

  const refs = new Set();
  const slugs = new Set();

  for (const entity of manifest.entities) {
    if (!entity.ref || !entity.type || !entity.slug || !entity.title) {
      throw new Error("Chaque entité du manifeste doit avoir ref, type, slug et title.");
    }

    if (refs.has(entity.ref)) {
      throw new Error(`Référence Knowledge dupliquée: ${entity.ref}`);
    }

    refs.add(entity.ref);

    const key = `${manifest.language || "fr"}:${entity.slug}`;
    if (slugs.has(key)) {
      throw new Error(`Slug Knowledge dupliqué: ${entity.slug}`);
    }
    slugs.add(key);
  }

  for (const relation of manifest.relations) {
    if (!refs.has(relation.sourceRef) || !refs.has(relation.targetRef)) {
      throw new Error("Une relation du manifeste référence une entité inconnue.");
    }
    if (!relation.relationType) {
      throw new Error("Chaque relation doit déclarer relationType.");
    }
  }

  if (Array.isArray(manifest.expertise) && manifest.expertise.length) {
    throw new Error("Les expertises du pilote doivent rester vides tant qu'elles ne sont pas explicitement validées.");
  }

  return true;
}

function buildKnowledgePilotPlan({ manifest, existingEntities = [], existingRelations = [] }) {
  validateManifest(manifest);

  const language = manifest.language || "fr";
  const existingByKey = new Map(
    existingEntities.map((entity) => [entityKey(entity), entity])
  );
  const resolvedIds = new Map();
  const actions = [];

  for (const desired of manifest.entities) {
    const target = { ...desired, language };
    const existing = existingByKey.get(entityKey(target));

    if (!existing) {
      actions.push({
        action: "create_entity",
        ref: desired.ref,
        entity: comparableEntity(target),
      });
      continue;
    }

    resolvedIds.set(desired.ref, existing.id);

    if (sameEntity(existing, target)) {
      actions.push({
        action: "noop_entity",
        ref: desired.ref,
        entityId: existing.id,
      });
    } else {
      actions.push({
        action: "update_entity",
        ref: desired.ref,
        entityId: existing.id,
        entity: comparableEntity(target),
      });
    }
  }

  const existingRelationKeys = new Set(existingRelations.map(relationKey));

  for (const desired of manifest.relations) {
    const sourceId = resolvedIds.get(desired.sourceRef) || null;
    const targetId = resolvedIds.get(desired.targetRef) || null;

    if (sourceId && targetId) {
      const key = relationKey({
        sourceId,
        targetId,
        relationType: desired.relationType,
      });

      if (existingRelationKeys.has(key)) {
        actions.push({
          action: "noop_relation",
          sourceRef: desired.sourceRef,
          targetRef: desired.targetRef,
          relationType: desired.relationType,
        });
        continue;
      }
    }

    actions.push({
      action: "create_relation",
      sourceRef: desired.sourceRef,
      targetRef: desired.targetRef,
      relationType: desired.relationType,
      sourceId,
      targetId,
    });
  }

  return {
    mode: "dry-run",
    destructive: false,
    writes: false,
    manifestKey: manifest.key || null,
    actions,
  };
}

module.exports = {
  buildKnowledgePilotPlan,
  validateManifest,
};
