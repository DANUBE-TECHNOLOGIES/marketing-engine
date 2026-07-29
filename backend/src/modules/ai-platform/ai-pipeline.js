"use strict";
function validate(output) {
  const errors = [];
  if (!output?.title) errors.push("TITLE_REQUIRED");
  if (!output?.introduction) errors.push("INTRODUCTION_REQUIRED");
  if (!Array.isArray(output?.sections) || !output.sections.length) errors.push("SECTIONS_REQUIRED");
  return { valid: errors.length === 0, errors };
}
function provider() {
  return {
    name: "deterministic",
    async generate({ context }) {
      const name = context.entity?.name || context.topic || "Destination";
      return {
        title: `Découvrir ${name}`,
        introduction: context.entity?.description || `${name} offre de nombreuses possibilités de séjour.`,
        sections: [
          { heading: `Pourquoi découvrir ${name} ?`, body: `Préparez votre voyage à ${name} avec des conseils adaptés.` },
          { heading: `Organiser votre séjour à ${name}`, body: "Choisissez la durée, la saison et l'hébergement selon vos attentes." }
        ],
        faq: [{ question: `Quand partir à ${name} ?`, answer: "La période idéale dépend du climat et des activités recherchées." }],
        callToAction: `Contactez Mondescale Voyages pour construire votre séjour à ${name}.`
      };
    }
  };
}
function create({ sdk, promptEngine, generationProvider = provider() }) {
  async function run(context, options = {}) {
    const started = Date.now();
    const prompt = promptEngine.build(context, options.prompt || {});
    sdk.events.publish("ai.pipeline.started", { provider: generationProvider.name });
    const output = await generationProvider.generate({ context, prompt, options });
    const validation = validate(output);
    const result = {
      status: validation.valid ? "completed" : "rejected",
      provider: generationProvider.name,
      prompt, output, validation,
      durationMs: Date.now() - started
    };
    sdk.events.publish(`ai.pipeline.${result.status}`, { durationMs: result.durationMs });
    return result;
  }
  return { run, validateOutput: validate, provider: generationProvider.name };
}
module.exports = { create, validate, provider };
