"use strict";
const templates = require("./templates");

class AiSeoGeneratorService {
  constructor({ provider } = {}) {
    this.provider = provider || null;
  }

  health() {
    return { ok: true, version: "16.2.0", capability: "ai-seo-generator", mode: this.provider ? "provider" : "deterministic", channels: ["landing-page", "faq"] };
  }

  async generate(task, context = {}) {
    const campaign = context.campaign || {};
    if (!task?.id) throw Object.assign(new Error("Tâche de génération invalide."), { statusCode: 400, code: "INVALID_GENERATION_TASK" });
    if (!campaign?.id) throw Object.assign(new Error("Campagne absente du contexte."), { statusCode: 400, code: "GENERATION_CAMPAIGN_REQUIRED" });

    if (this.provider) {
      const output = await this.provider.generate({ task, campaign });
      return this.normalize(output, task, campaign);
    }

    const output = task.channel === "landing-page"
      ? templates.landingPage(task, campaign)
      : task.channel === "faq"
        ? templates.faqAsset(task, campaign)
        : templates.genericAsset(task, campaign);
    return this.normalize(output, task, campaign);
  }

  normalize(output, task, campaign) {
    if (!output || typeof output !== "object") throw Object.assign(new Error("Le générateur n'a retourné aucun contenu."), { statusCode: 502, code: "EMPTY_GENERATION_OUTPUT" });
    return {
      campaignId: campaign.id,
      taskId: task.id,
      type: output.type || task.channel || task.type,
      channel: task.channel || null,
      status: ["landing-page", "faq"].includes(task.channel) ? "review" : "draft",
      title: output.title || campaign.name,
      payload: output.payload || {},
      metadata: {
        ...(output.metadata || {}),
        generator: "ai-seo-generator",
        generatorVersion: "16.2.0",
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = { AiSeoGeneratorService };
