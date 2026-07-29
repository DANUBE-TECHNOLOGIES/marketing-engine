"use strict";
const layers = {
  seo: c => `Rédige un contenu SEO utile sur ${c.entity?.name || c.topic}. Structure le texte et ajoute une FAQ.`,
  marketing: c => `Adopte un ton inspirant, concret et crédible pour ${c.entity?.name || c.topic}.`,
  eeat: () => "N'invente aucune donnée absente du contexte. Distingue faits et recommandations.",
  conversion: c => `Termine par un appel à l'action adapté à ${c.agency?.name || "Mondescale Voyages"}.`
};
function create({ sdk }) {
  function list() {
    return Object.keys(layers).map(layer => ({ id: `${layer}.destination.v1`, layer, version: "1.0.0" }));
  }
  function build(context = {}, options = {}) {
    const selected = options.layers || Object.keys(layers);
    const sections = selected.filter(x => layers[x]).map(layer => ({
      id: `${layer}.destination.v1`,
      layer,
      version: "1.0.0",
      content: layers[layer](context)
    }));
    const result = {
      version: "1.0.0",
      sections,
      prompt: sections.map(x => `[${x.layer.toUpperCase()}]\n${x.content}`).join("\n\n")
    };
    sdk.events.publish("prompt.built", { layers: selected, entityId: context.entity?.id });
    return result;
  }
  return { list, build };
}
module.exports = { create };
