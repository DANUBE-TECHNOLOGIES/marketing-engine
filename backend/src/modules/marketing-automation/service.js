const renderers = require("./channel-renderers");
const { normalizeSource } = require("./utils");
const { validateRender, validateCampaign } = require("./validation");
const MarketingAutomationRepository = require("./repository");

class MarketingAutomationService {
  constructor(prisma, repository = null) { this.repository = repository || new MarketingAutomationRepository(prisma); }
  render(payload = {}) {
    const { channels } = validateRender(payload);
    const source = normalizeSource(payload.source);
    const channelOptions = payload.channelOptions || {};
    const outputs = channels.map((channel) => renderers[channel](source, channelOptions[channel] || {}));
    return { source, channels, outputs, generatedAt: new Date().toISOString() };
  }
  async createCampaign(payload = {}) {
    validateCampaign(payload);
    const rendered = this.render(payload);
    const campaign = await this.repository.createCampaign({
      name: payload.name || rendered.source.title,
      siteId: payload.siteId || null,
      sourcePageId: payload.sourcePageId || null,
      destinationSlug: payload.destinationSlug || null,
      status: payload.scheduledAt ? "scheduled" : "draft",
      objective: payload.objective || "traffic",
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
      source: rendered.source,
      metadata: payload.metadata || null,
      createdBy: payload.actor || null
    });
    const publications = await this.repository.createPublications(campaign.id, rendered.outputs, payload.scheduledAt);
    return { ...campaign, publications };
  }
  async getCampaign(id) {
    const campaign = await this.repository.getCampaign(id);
    if (!campaign) { const error = new Error("Campagne introuvable"); error.status = 404; throw error; }
    return campaign;
  }
  async calendar(query = {}) {
    const items = await this.repository.listCampaigns(query);
    return { filters: query, total: items.length, items };
  }
}
module.exports = MarketingAutomationService;
