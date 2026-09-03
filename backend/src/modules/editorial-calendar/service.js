const { buildSlots } = require("./planner");
const { validatePlan } = require("./validation");
const MarketingAutomationService = require("../marketing-automation/service");

class EditorialCalendarService {
  constructor(prisma, marketingService = null) {
    this.marketingService = marketingService || new MarketingAutomationService(prisma);
  }

  preview(payload = {}) {
    validatePlan(payload);
    const slots = buildSlots({
      startDate: payload.startDate,
      endDate: payload.endDate,
      postsPerWeek: payload.postsPerWeek,
      destinations: payload.destinations,
      agency: payload.agency || {},
      channels: payload.channels || ["google_business", "facebook", "instagram"]
    });
    return {
      siteId: payload.siteId || null,
      agency: payload.agency || null,
      period: { startDate: payload.startDate, endDate: payload.endDate },
      postsPerWeek: Number(payload.postsPerWeek) || 3,
      total: slots.length,
      slots,
      generatedAt: new Date().toISOString()
    };
  }

  async generate(payload = {}) {
    const plan = this.preview(payload);
    const campaigns = [];
    for (const slot of plan.slots) {
      const campaign = await this.marketingService.createCampaign({
        name: slot.source.title,
        siteId: payload.siteId || null,
        destinationSlug: slot.destination.slug,
        objective: slot.objective,
        scheduledAt: slot.scheduledAt,
        source: slot.source,
        channels: slot.channels,
        metadata: {
          generatedBy: "editorial-calendar",
          sequence: slot.sequence,
          format: slot.format,
          editorialAngle: slot.source.editorialAngle
        },
        actor: payload.actor || null
      });
      campaigns.push(campaign);
    }
    return { ...plan, persisted: true, campaigns };
  }
}
module.exports = EditorialCalendarService;
