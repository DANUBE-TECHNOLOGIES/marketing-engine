"use strict";
function create({ sdk, knowledge, pipeline }) {
  async function compose(input = {}) {
    const identifier = input.entityId || input.slug || input.topic;
    if (!identifier) throw new TypeError("entityId, slug ou topic obligatoire.");
    const entity = await knowledge.getEntity(identifier) || {
      id: null,
      slug: input.slug || null,
      name: input.topic || identifier,
      type: input.type || "topic",
      description: input.description || null,
      data: input.data || {},
      source: "request"
    };
    const context = {
      entity,
      topic: input.topic,
      keyword: input.keyword || entity.name,
      agency: input.agency || null,
      locale: input.locale || "fr-FR",
      audience: input.audience || "voyageurs"
    };
    const execution = await pipeline.run(context, input.options || {});
    const result = { composerVersion: "2.0.0", entity, context, pipeline: execution, content: execution.output };
    sdk.events.publish("content.composed", { entityId: entity.id, entityName: entity.name, status: execution.status });
    return result;
  }
  return { compose };
}
module.exports = { create };
