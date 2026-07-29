"use strict";
function normalize(raw) {
  if (!raw) return null;
  return {
    id: raw.id || null,
    slug: raw.slug || raw.key || null,
    name: raw.name || raw.title || raw.label || null,
    type: raw.type || raw.kind || "entity",
    description: raw.description || raw.summary || null,
    data: raw.data || raw.attributes || {},
    relations: raw.relations || raw.links || [],
    source: raw.source || "knowledge"
  };
}
function create({ prisma, sdk }) {
  async function getEntity(identifier) {
    if (!identifier) throw new TypeError("Identifiant obligatoire.");
    const key = `knowledge:${String(identifier).toLowerCase()}`;
    const cached = sdk.cache.get(key);
    if (cached) return cached;
    const models = ["knowledgeEntity", "entity", "knowledgeNode", "destination"];
    for (const name of models) {
      const model = prisma && prisma[name];
      if (!model || typeof model.findFirst !== "function") continue;
      for (const field of ["id", "slug", "name", "title"]) {
        try {
          const row = await model.findFirst({ where: { [field]: identifier } });
          if (row) {
            const entity = normalize(row);
            sdk.cache.set(key, entity, 300);
            sdk.events.publish("knowledge.entity.read", { identifier, entityId: entity.id });
            return entity;
          }
        } catch (_) {}
      }
    }
    return null;
  }
  return { getEntity, normalize };
}
module.exports = { create, normalize };
