"use strict";
const AiContentRepository = require("./repository");
const { createProvider } = require("./providers");
const { validatePreview, validateGenerate } = require("./validation");
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
function toInspiration(content) {
  const body = asObject(content.body);
  const seo = asObject(content.seo);
  const target = targeting(content);
  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    excerpt: content.excerpt,
    imageUrl: body.imageUrl || seo.imageUrl || null,
    imageAlt: body.imageAlt || content.title,
    category: body.category || "Inspiration",
    theme: body.theme || null,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    body,
    seo,
    schemaOrg: content.schemaOrg,
    editorialTargeting: target,
  };
}
function assertStandalonePublication(content) {
  const target = targeting(content);
  if (target.scope !== "agencies") return;
  if (!target.agencyIds.length) {
    throw httpError("Sélectionnez au moins une agence avant publication.", 409, "EDITORIAL_TARGET_AGENCY_REQUIRED");
  }
  if (!target.indexAgencyId || !target.agencyIds.includes(target.indexAgencyId)) {
    throw httpError("Choisissez l'agence propriétaire de l'indexation SEO avant publication.", 409, "EDITORIAL_INDEX_OWNER_REQUIRED");
  }
}
async function assertEditorialCanonicalIsPublishable(prisma, tenantId, content) {
  const target = targeting(content);
  if (target.scope !== "agencies") return;
  const canonical = await resolveEditorialCanonical(prisma, tenantId, content);
  if (!canonical) {
    throw httpError("L'agence propriétaire de l'indexation SEO doit disposer d'un mini-site publié.", 409, "EDITORIAL_INDEX_OWNER_SITE_UNPUBLISHED");
  }
}
function bodyText(body = {}) {
  return [
    body.introduction,
    ...(Array.isArray(body.sections) ? body.sections.flatMap((section) => [section?.heading, section?.content]) : []),
    ...(Array.isArray(body.faq) ? body.faq.flatMap((item) => [item?.question, item?.answer]) : []),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function wordCount(value) {
  const text = String(value || "").trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}
function promisedCount(topic) {
  const match = String(topic || "").match(/\b([2-9]|1\d|20)\b/);
  return match ? Number(match[1]) : null;
}
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
  constructor(prisma, tenantId, options = {}) {
    this.prisma = prisma;
    this.tenantId = tenantId;
    this.repo = options.repo || new AiContentRepository(prisma, tenantId);
    this.provider = options.provider || createProvider(options.env || process.env);
  }

  health() {
    return {
      ok: true,
      version: "17.2.0",
      capability: "ai-content-service",
      provider: this.provider.name,
      channels: ["landing-page", "article", "faq", "google-business", "facebook", "instagram", "newsletter"],
      features: ["preview", "generation", "retry", "campaign-assets", "provider-adapters", "published-catalog", "content-publication"],
    };
  }

  async preview(payload) {
    const data = validatePreview(payload);
    const output = await this.generatePayload(data);
    return { preview: output, provider: this.provider.name };
  }

  async generate(payload) {
    const data = validateGenerate(payload);
    const job = await this.repo.createJob({
      campaignId: data.campaignId,
      promptId: data.promptId,
      status: "queued",
      channel: data.channel,
      locale: data.locale,
      provider: this.provider.name,
      input: data,
      requestedBy: data.requestedBy,
      maxAttempts: data.maxAttempts,
    });
    return this.execute(job.id);
  }

  async retry(jobId) {
    const current = await this.repo.getJob(jobId);
    if (!current) throw httpError("Job IA introuvable.", 404, "AI_CONTENT_JOB_NOT_FOUND");
    if (current.status !== "failed") throw httpError("Seuls les jobs en échec peuvent être relancés.", 409, "AI_CONTENT_RETRY_NOT_ALLOWED");
    if (current.attempts >= current.maxAttempts) throw httpError("Nombre maximal de tentatives atteint.", 409, "AI_CONTENT_MAX_ATTEMPTS_REACHED");
    await this.repo.updateJob(jobId, { status: "queued", error: null, completedAt: null });
    return this.execute(jobId);
  }

  async list(filters) { return this.repo.listJobs(filters); }
  async get(id) { const row = await this.repo.getJob(id); if (!row) throw httpError("Job IA introuvable.", 404, "AI_CONTENT_JOB_NOT_FOUND"); return row; }
  async getContent(id) { const row = await this.repo.getContent(id); if (!row) throw httpError("Contenu IA introuvable.", 404, "AI_CONTENT_CONTENT_NOT_FOUND"); return row; }
  async publishContent(id) {
    const content = await this.getContent(id);
    assertStandalonePublication(content);
    await assertEditorialCanonicalIsPublishable(this.prisma, this.tenantId, content);
    return this.repo.publishContent(id);
  }
  async unpublishContent(id) { await this.getContent(id); return this.repo.unpublishContent(id); }

  async execute(jobId) {
    const job = await this.get(jobId);
    const attempts = Number(job.attempts || 0) + 1;
    if (attempts > job.maxAttempts) throw httpError("Nombre maximal de tentatives atteint.", 409, "AI_CONTENT_MAX_ATTEMPTS_REACHED");
    await this.repo.updateJob(job.id, { status: "running", attempts, startedAt: job.startedAt || new Date(), lastAttemptAt: new Date(), error: null });
    try {
      const output = await this.generatePayload(job.input);
      const revision = await this.repo.nextRevision(job.channel, output.slug);
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
    const rawTitle = String(output.title || `${data.topic} avec ${data.agencyName}`).trim();
    const title = data.channel === "article" ? editorialTitle(rawTitle, data) : truncate(rawTitle, 70);
    const excerpt = truncate(output.excerpt || output.body?.introduction || "", 170);
    const slug = slugify(output.slug || `${data.topic}-${data.city || data.agencyName}`);
    const keywords = [...new Set([data.topic, data.city, data.tourOperator, ...data.keywords].filter(Boolean))];
    const body = output.body || {};
    const qualityScore = data.channel === "article"
      ? editorialQualityScore(body, excerpt, data)
      : Math.min(100, 55 + (body.sections?.length || 0) * 8 + (body.faq?.length || 0) * 5 + (excerpt.length >= 120 ? 10 : 0));
    return {
      title, excerpt, slug, body,
      seo: { title, description: excerpt, canonicalSlug: slug, keywords, robots: "index,follow", openGraph: { title, description: excerpt, type: "article" } },
      schemaOrg: output.schemaOrg || { "@context": "https://schema.org", "@type": data.channel === "faq" ? "FAQPage" : "WebPage", name: title, description: excerpt, about: data.topic, publisher: { "@type": "TravelAgency", name: data.agencyName } },
      qualityScore,
    };
  }
}

module.exports = { AiContentService, slugify, toInspiration, assertStandalonePublication, assertEditorialCanonicalIsPublishable };