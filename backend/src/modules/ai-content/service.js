"use strict";

const AiContentRepository = require("./repository");
const { validateGenerate } = require("./validation");
const { createProvider } = require("./providers");

function httpError(message, statusCode, code) { return Object.assign(new Error(message), { statusCode, code }); }
function slugify(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90); }
function truncate(value, max) { const s = String(value || "").trim(); return s.length <= max ? s : `${s.slice(0, max - 1).trim()}…`; }
function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }

function inspirationImage(content) {
  const body = asObject(content?.body);
  const seo = asObject(content?.seo);
  const openGraph = asObject(seo.openGraph);
  const hero = asObject(body.hero);
  const media = asObject(body.media);

  const candidates = [
    body.image,
    body.imageUrl,
    body.heroImage,
    hero.image,
    hero.imageUrl,
    media.image,
    media.imageUrl,
    openGraph.image,
    openGraph.imageUrl,
  ];

  return candidates.find(value => typeof value === "string" && value.trim()) || null;
}

function inspirationCategory(content) {
  const body = asObject(content?.body);
  return body.category || body.theme || content?.channel || "Inspiration";
}

function toInspiration(content) {
  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    description: content.excerpt || asObject(content.body).introduction || "",
    category: inspirationCategory(content),
    image: inspirationImage(content),
    channel: content.channel,
    locale: content.locale,
    qualityScore: content.qualityScore,
    publishedAt: content.publishedAt,
  };
}

class AiContentService {
  constructor(prismaOrRepo, tenantId, { provider, env } = {}) {
    this.repo = prismaOrRepo?.createJob ? prismaOrRepo : new AiContentRepository(prismaOrRepo, tenantId);
    this.provider = provider || createProvider(env);
  }

  health() {
    return {
      ok: true,
      version: "17.2.0",
      capability: "ai-content-service",
      provider: this.provider.name,
      channels: ["landing-page", "article", "faq", "google-business", "facebook", "instagram", "newsletter"],
      features: ["preview", "generation", "retry", "campaign-assets", "provider-adapters", "published-catalog"],
    };
  }

  async list(filters) { return this.repo.listJobs(filters); }
  async get(id) { const job = await this.repo.getJob(id); if (!job) throw httpError("Job IA introuvable.", 404, "AI_CONTENT_JOB_NOT_FOUND"); return job; }

  async listPublished(filters = {}) {
    const ids = String(filters.ids || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
      .slice(0, 100);

    const channel = String(filters.channel || "").trim() || undefined;
    const limit = Math.min(Math.max(Number(filters.limit) || 24, 1), 100);
    const contents = await this.repo.listPublishedContents({ ids, channel, limit });
    const items = contents.map(toInspiration);

    if (!ids.length) {
      return { items, count: items.length };
    }

    const byId = new Map(items.map(item => [String(item.id), item]));
    const ordered = ids.map(id => byId.get(String(id))).filter(Boolean).slice(0, limit);
    return { items: ordered, count: ordered.length };
  }

  async prepare(input) {
    const data = validateGenerate(input);
    const campaign = data.campaignId ? await this.repo.getCampaign(data.campaignId) : null;
    if (data.campaignId && !campaign) throw httpError("Campagne introuvable.", 404, "CAMPAIGN_NOT_FOUND");
    const prompt = data.promptId ? await this.repo.getPrompt(data.promptId) : null;
    if (data.promptId && !prompt) throw httpError("Prompt actif introuvable.", 404, "AI_CONTENT_PROMPT_NOT_FOUND");
    return { data: this.enrichFromCampaign(data, campaign), campaign, prompt };
  }

  enrichFromCampaign(data, campaign) {
    if (!campaign) return data;
    const destination = campaign.destinations?.[0]?.destination;
    const agency = campaign.agencies?.[0]?.agency;
    return {
      ...data,
      topic: data.topic || destination?.name || campaign.name,
      city: data.city || agency?.city || "",
      agencyName: data.agencyName === "Mondescale Voyages" ? (agency?.name || data.agencyName) : data.agencyName,
      campaignName: campaign.name,
      destinationSlug: destination?.slug || campaign.destinationSlug || null,
    };
  }

  async preview(input) {
    const { data } = await this.prepare(input);
    return this.generatePayload(data);
  }

  async generate(input) {
    const { data } = await this.prepare(input);
    const job = await this.repo.createJob({
      campaignId: data.campaignId,
      promptId: data.promptId,
      status: "queued",
      channel: data.channel,
      locale: data.locale,
      provider: this.provider.name,
      input: data,
      requestedBy: data.requestedBy,
      attempts: 0,
      maxAttempts: data.maxAttempts,
    });
    return this.execute(job);
  }

  async retry(id) {
    const job = await this.get(id);
    if (!["failed", "completed"].includes(job.status)) throw httpError("Ce job ne peut pas être relancé dans son état actuel.", 409, "AI_CONTENT_JOB_NOT_RETRYABLE");
    if ((job.attempts || 0) >= (job.maxAttempts || 3)) throw httpError("Nombre maximal de tentatives atteint.", 409, "AI_CONTENT_MAX_ATTEMPTS_REACHED");
    return this.execute(job);
  }

  async execute(job) {
    const attempt = (job.attempts || 0) + 1;
    await this.repo.updateJob(job.id, { status: "running", attempts: attempt, lastAttemptAt: new Date(), startedAt: new Date(), error: null });
    try {
      const output = await this.generatePayload(job.input);
      const revision = this.repo.nextRevision ? await this.repo.nextRevision(job.channel, output.slug) : 1;
      const content = await this.repo.createContent({
        campaignId: job.campaignId,
        generationJobId: job.id,
        channel: job.channel,
        locale: job.locale,
        slug: output.slug,
        status: "review",
        title: output.title,
        excerpt: output.excerpt,
        body: output.body,
        seo: output.seo,
        schemaOrg: output.schemaOrg,
        qualityScore: output.qualityScore,
        revision,
      });
      const asset = this.repo.createCampaignAsset ? await this.repo.createCampaignAsset({
        campaignId: job.campaignId,
        type: "seo-content",
        channel: job.channel,
        status: "review",
        title: output.title,
        payload: { seoContentId: content.id, slug: output.slug, body: output.body, seo: output.seo, schemaOrg: output.schemaOrg },
        metadata: { generationJobId: job.id, provider: this.provider.name, qualityScore: output.qualityScore, revision },
      }) : null;
      const completed = await this.repo.updateJob(job.id, {
        status: "completed",
        output: { contentId: content.id, assetId: asset?.id || null, slug: content.slug, qualityScore: content.qualityScore, revision },
        completedAt: new Date(),
      });
      return { job: completed, content, asset };
    } catch (error) {
      await this.repo.updateJob(job.id, { status: "failed", error: String(error.message || error), completedAt: new Date() });
      throw error;
    }
  }

  async generatePayload(data) {
    return this.normalize(await this.provider.generate(data), data);
  }

  normalize(output, data) {
    if (!output || typeof output !== "object") throw httpError("Le fournisseur IA n'a retourné aucun contenu.", 502, "EMPTY_AI_CONTENT_OUTPUT");
    const title = truncate(output.title || `${data.topic} avec ${data.agencyName}`, 70);
    const excerpt = truncate(output.excerpt || output.body?.introduction || "", 170);
    const slug = slugify(output.slug || `${data.topic}-${data.city || data.agencyName}`);
    const keywords = [...new Set([data.topic, data.city, data.tourOperator, ...data.keywords].filter(Boolean))];
    const body = output.body || {};
    const qualityScore = Math.min(100, 55 + (body.sections?.length || 0) * 8 + (body.faq?.length || 0) * 5 + (excerpt.length >= 120 ? 10 : 0));
    return {
      title, excerpt, slug, body,
      seo: { title, description: excerpt, canonicalSlug: slug, keywords, robots: "index,follow", openGraph: { title, description: excerpt, type: "article" } },
      schemaOrg: output.schemaOrg || { "@context": "https://schema.org", "@type": data.channel === "faq" ? "FAQPage" : "WebPage", name: title, description: excerpt, about: data.topic, publisher: { "@type": "TravelAgency", name: data.agencyName } },
      qualityScore,
    };
  }
}

module.exports = { AiContentService, slugify, toInspiration };
