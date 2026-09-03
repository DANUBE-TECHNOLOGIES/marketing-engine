"use strict";
const AiContentRepository = require("./repository");
const { createProvider } = require("./providers");
const { validateGenerate } = require("./validation");
const { resolveEditorialCanonical } = require("./editorial-canonical");

function slugify(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "contenu";
}
function truncate(value, max) { const text = String(value || "").trim(); return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`; }
function compactTitle(value, max = 65) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const candidate = text.slice(0, max + 1);
  const boundary = candidate.lastIndexOf(" ");
  return (boundary >= Math.floor(max * 0.65) ? candidate.slice(0, boundary) : text.slice(0, max)).trim().replace(/[\s:;,\-–—]+$/, "");
}
function editorialTitle(outputTitle, data) {
  const generated = String(outputTitle || "").trim();
  if (generated && generated.length <= 65 && !generated.endsWith("…")) return generated;
  const topic = String(data.topic || "").trim();
  if (topic) return compactTitle(topic, 65);
  return compactTitle(generated || `${data.topic} avec ${data.agencyName}`, 65);
}
function httpError(message, statusCode, code, details) { return Object.assign(new Error(message), { statusCode, code, details }); }
function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function targeting(content) {
  const value = asObject(asObject(content?.seo).editorialTargeting);
  return {
    scope: value.scope === "agencies" ? "agencies" : "network",
    agencyIds: Array.isArray(value.agencyIds) ? value.agencyIds.map(String).filter(Boolean) : [],
    indexAgencyId: value.indexAgencyId ? String(value.indexAgencyId) : null,
  };
}
function inspirationImage(content) {
  const body = asObject(content?.body);
  const seo = asObject(content?.seo);
  const openGraph = asObject(seo.openGraph);
  const hero = asObject(body.hero);
  const media = asObject(body.media);
  return [body.image, body.imageUrl, body.heroImage, hero.image, hero.imageUrl, media.image, media.imageUrl, openGraph.image, openGraph.imageUrl]
    .find(value => typeof value === "string" && value.trim()) || null;
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
function assertStandalonePublication(content) {
  const target = targeting(content);
  if (target.scope !== "agencies") return;
  if (!target.agencyIds.length) throw httpError("Sélectionnez au moins une agence avant publication.", 409, "EDITORIAL_TARGET_AGENCY_REQUIRED");
  if (!target.indexAgencyId || !target.agencyIds.includes(target.indexAgencyId)) throw httpError("Choisissez l'agence propriétaire de l'indexation SEO avant publication.", 409, "EDITORIAL_INDEX_OWNER_REQUIRED");
}
async function assertEditorialCanonicalIsPublishable(prisma, tenantId, content) {
  const target = targeting(content);
  if (target.scope !== "agencies") return;
  const canonical = await resolveEditorialCanonical(prisma, tenantId, content);
  if (!canonical) throw httpError("L'agence propriétaire de l'indexation SEO doit disposer d'un mini-site publié.", 409, "EDITORIAL_INDEX_OWNER_SITE_UNPUBLISHED");
}
function bodyText(body = {}) {
  return [body.introduction, ...(Array.isArray(body.sections) ? body.sections.flatMap(section => [section?.heading, section?.content]) : []), ...(Array.isArray(body.faq) ? body.faq.flatMap(item => [item?.question, item?.answer]) : [])]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function wordCount(value) { const text = String(value || "").trim(); return text ? text.split(/\s+/).filter(Boolean).length : 0; }
function promisedCount(topic) { const match = String(topic || "").match(/\b([2-9]|1\d|20)\b/); return match ? Number(match[1]) : null; }
function editorialQualityScore(body, excerpt, data) {
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const faq = Array.isArray(body.faq) ? body.faq : [];
  const words = wordCount(bodyText(body));
  let score = 35;
  if (excerpt.length >= 120 && excerpt.length <= 170) score += 10;
  if (wordCount(body.introduction) >= 45) score += 10;
  if (sections.length >= 5) score += 15;
  if (faq.length >= 3) score += 10;
  if (words >= 900) score += 15;
  else if (words >= 750) score += 8;
  const promised = data.channel === "article" ? promisedCount(data.topic) : null;
  if (promised && sections.length === promised) score += 5;
  else if (promised && sections.length !== promised) score -= 15;
  return Math.max(0, Math.min(100, score));
}

class AiContentService {
  constructor(prismaOrRepo, tenantId, options = {}) {
    const isRepo = prismaOrRepo && typeof prismaOrRepo.createJob === "function";
    this.prisma = isRepo ? null : prismaOrRepo;
    this.tenantId = tenantId;
    this.repo = options.repo || (isRepo ? prismaOrRepo : new AiContentRepository(prismaOrRepo, tenantId));
    this.provider = options.provider || createProvider(options.env || process.env);
  }

  health() {
    return { ok: true, version: "17.2.0", capability: "ai-content-service", provider: this.provider.name,
      channels: ["landing-page", "article", "faq", "google-business", "facebook", "instagram", "newsletter"],
      features: ["preview", "generation", "retry", "campaign-assets", "provider-adapters", "published-catalog", "content-publication"] };
  }

  async list(filters) { return this.repo.listJobs(filters); }
  async get(id) { const row = await this.repo.getJob(id); if (!row) throw httpError("Job IA introuvable.", 404, "AI_CONTENT_JOB_NOT_FOUND"); return row; }
  async getContent(id) { const row = await this.repo.getContent(id); if (!row) throw httpError("Contenu IA introuvable.", 404, "AI_CONTENT_CONTENT_NOT_FOUND"); return row; }

  async listPublished(filters = {}) {
    const ids = String(filters.ids || "").split(",").map(value => value.trim()).filter(Boolean).slice(0, 100);
    const channel = String(filters.channel || "").trim() || undefined;
    const agencyId = String(filters.agencyId || "").trim() || undefined;
    const limit = Math.min(Math.max(Number(filters.limit) || 24, 1), 100);
    const contents = await this.repo.listPublishedContents({ ids, channel, agencyId, limit });
    const items = contents.map(toInspiration);
    if (!ids.length) return { items, count: items.length };
    const byId = new Map(items.map(item => [String(item.id), item]));
    const ordered = ids.map(id => byId.get(String(id))).filter(Boolean).slice(0, limit);
    return { items: ordered, count: ordered.length };
  }

  async prepare(input) {
    const data = validateGenerate(input);
    const campaign = data.campaignId && this.repo.getCampaign ? await this.repo.getCampaign(data.campaignId) : null;
    if (data.campaignId && !campaign) throw httpError("Campagne introuvable.", 404, "CAMPAIGN_NOT_FOUND");
    const prompt = data.promptId && this.repo.getPrompt ? await this.repo.getPrompt(data.promptId) : null;
    if (data.promptId && !prompt) throw httpError("Prompt actif introuvable.", 404, "AI_CONTENT_PROMPT_NOT_FOUND");
    return { data: this.enrichFromCampaign(data, campaign), campaign, prompt };
  }

  enrichFromCampaign(data, campaign) {
    if (!campaign) return data;
    const destination = campaign.destinations?.[0]?.destination;
    const agency = campaign.agencies?.[0]?.agency;
    return { ...data, topic: data.topic || destination?.name || campaign.name, city: data.city || agency?.city || "",
      agencyName: data.agencyName === "Mondescale Voyages" ? (agency?.name || data.agencyName) : data.agencyName,
      campaignName: campaign.name, destinationSlug: destination?.slug || campaign.destinationSlug || null };
  }

  async preview(input) { const { data } = await this.prepare(input); return this.generatePayload(data); }

  async generate(input) {
    const { data } = await this.prepare(input);
    const job = await this.repo.createJob({ campaignId: data.campaignId, promptId: data.promptId, status: "queued", channel: data.channel,
      locale: data.locale, provider: this.provider.name, input: data, requestedBy: data.requestedBy, attempts: 0, maxAttempts: data.maxAttempts });
    return this.execute(job);
  }

  async retry(id) {
    const job = await this.get(id);
    if (!["failed", "completed"].includes(job.status)) throw httpError("Ce job ne peut pas être relancé dans son état actuel.", 409, "AI_CONTENT_JOB_NOT_RETRYABLE");
    if ((job.attempts || 0) >= (job.maxAttempts || 3)) throw httpError("Nombre maximal de tentatives atteint.", 409, "AI_CONTENT_MAX_ATTEMPTS_REACHED");
    return this.execute(job);
  }

  async publishContent(id) {
    const content = await this.getContent(id);
    if (String(content.status || "").toLowerCase() === "published") return content;
    assertStandalonePublication(content);
    if (this.prisma) await assertEditorialCanonicalIsPublishable(this.prisma, this.tenantId, content);
    return this.repo.publishContent ? this.repo.publishContent(id) : this.repo.updateContent(id, { status: "published", publishedAt: new Date() });
  }
  async unpublishContent(id) {
    const content = await this.getContent(id);
    if (String(content.status || "").toLowerCase() === "review") return content;
    return this.repo.unpublishContent ? this.repo.unpublishContent(id) : this.repo.updateContent(id, { status: "review", publishedAt: null });
  }

  async execute(job) {
    const attempts = Number(job.attempts || 0) + 1;
    if (attempts > job.maxAttempts) throw httpError("Nombre maximal de tentatives atteint.", 409, "AI_CONTENT_MAX_ATTEMPTS_REACHED");
    await this.repo.updateJob(job.id, { status: "running", attempts, startedAt: job.startedAt || new Date(), lastAttemptAt: new Date(), error: null });
    try {
      const output = await this.generatePayload(job.input);
      const revision = this.repo.nextRevision ? await this.repo.nextRevision(job.channel, output.slug) : 1;
      const content = await this.repo.createContent({ campaignId: job.campaignId, generationJobId: job.id, channel: job.channel, locale: job.locale,
        slug: output.slug, status: "review", title: output.title, excerpt: output.excerpt, body: output.body, seo: output.seo,
        schemaOrg: output.schemaOrg, qualityScore: output.qualityScore, revision });
      const asset = this.repo.createCampaignAsset ? await this.repo.createCampaignAsset({ campaignId: job.campaignId, type: "seo-content", channel: job.channel,
        status: "review", title: output.title, payload: { seoContentId: content.id, slug: output.slug, body: output.body, seo: output.seo, schemaOrg: output.schemaOrg },
        metadata: { generationJobId: job.id, provider: this.provider.name, qualityScore: output.qualityScore, revision } }) : null;
      const completed = await this.repo.updateJob(job.id, { status: "completed", output: { contentId: content.id, assetId: asset?.id || null, slug: content.slug,
        qualityScore: content.qualityScore, revision }, completedAt: new Date() });
      return { job: completed, content, asset };
    } catch (error) {
      await this.repo.updateJob(job.id, { status: "failed", error: String(error.message || error), completedAt: new Date() });
      throw error;
    }
  }

  async generatePayload(data) { return this.normalize(await this.provider.generate(data), data); }

  normalize(output, data) {
    if (!output || typeof output !== "object") throw httpError("Le fournisseur IA n'a retourné aucun contenu.", 502, "EMPTY_AI_CONTENT_OUTPUT");
    const rawTitle = String(output.title || `${data.topic} avec ${data.agencyName}`).trim();
    const title = data.channel === "article" ? editorialTitle(rawTitle, data) : truncate(rawTitle, 70);
    const excerpt = truncate(output.excerpt || output.body?.introduction || "", 170);
    const slug = slugify(output.slug || `${data.topic}-${data.city || data.agencyName}`);
    const keywords = [...new Set([data.topic, data.city, data.tourOperator, ...data.keywords].filter(Boolean))];
    const body = output.body || {};
    const qualityScore = data.channel === "article" ? editorialQualityScore(body, excerpt, data)
      : Math.min(100, 55 + (body.sections?.length || 0) * 8 + (body.faq?.length || 0) * 5 + (excerpt.length >= 120 ? 10 : 0));
    return { title, excerpt, slug, body,
      seo: { title, description: excerpt, canonicalSlug: slug, keywords, robots: "index,follow", openGraph: { title, description: excerpt, type: "article" } },
      schemaOrg: output.schemaOrg || { "@context": "https://schema.org", "@type": data.channel === "faq" ? "FAQPage" : "WebPage", name: title,
        description: excerpt, about: data.topic, publisher: { "@type": "TravelAgency", name: data.agencyName } }, qualityScore };
  }
}

module.exports = { AiContentService, slugify, toInspiration, assertStandalonePublication, assertEditorialCanonicalIsPublishable };
