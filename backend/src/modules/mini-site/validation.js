const { ValidationError } = require("../../core/errors");
const slugify = require("../seo-factory/slug");

const SITE_STATUSES = new Set(["draft", "ready", "published", "archived"]);
const PAGE_TYPES = new Set([
  "HOME", "DESTINATION", "GUIDE", "PRACTICAL", "FAQ", "CONTACT", "LEGAL", "LANDING", "BLOG",
]);

function requiredText(value, field, max = 180) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`Le champ ${field} est obligatoire.`, { field });
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`Le champ ${field} ne doit pas dépasser ${max} caractères.`, { field, max });
  return normalized;
}

function optionalText(value, field, max = 255) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`Le champ ${field} doit être une chaîne.`, { field });
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`Le champ ${field} ne doit pas dépasser ${max} caractères.`, { field, max });
  return normalized || null;
}

function agencyId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ValidationError("Le champ agencyId doit être un identifiant numérique positif.", { field: "agencyId" });
  return String(parsed);
}

function siteStatus(value, required = false) {
  if ((value === undefined || value === null || value === "") && !required) return undefined;
  const normalized = requiredText(value, "status", 30).toLowerCase();
  if (!SITE_STATUSES.has(normalized)) throw new ValidationError("Statut de mini-site invalide.", { field: "status", allowed: [...SITE_STATUSES] });
  return normalized;
}

function pageType(value) {
  const normalized = requiredText(value, "type", 40).toUpperCase();
  if (!PAGE_TYPES.has(normalized)) throw new ValidationError("Type de page invalide.", { field: "type", allowed: [...PAGE_TYPES] });
  return normalized;
}

function jsonObject(value, field = "content") {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError(`Le champ ${field} doit être un objet JSON.`, { field });
  return value;
}

function normalizeSlug(value, fallback, field = "slug", allowEmpty = false) {
  const raw = value === undefined || value === null ? fallback : value;
  if (allowEmpty && raw === "") return "";
  const normalized = slugify(requiredText(String(raw), field, 120));
  if (!normalized && !allowEmpty) throw new ValidationError(`Le champ ${field} ne produit pas de slug valide.`, { field });
  return normalized;
}

function validateCreateSite(body = {}) {
  const name = requiredText(body.name, "name", 120);
  return { agencyId: agencyId(body.agencyId), name, slug: normalizeSlug(body.slug, name), domain: optionalText(body.domain, "domain", 255), status: siteStatus(body.status) || "draft", templateId: optionalText(body.templateId, "templateId", 191) };
}

function validateUpdateSite(body = {}) {
  const data = {};
  if (body.name !== undefined) data.name = requiredText(body.name, "name", 120);
  if (body.slug !== undefined) data.slug = normalizeSlug(body.slug, body.slug);
  if (body.domain !== undefined) data.domain = optionalText(body.domain, "domain", 255);
  if (body.status !== undefined) data.status = siteStatus(body.status, true);
  if (body.templateId !== undefined) data.templateId = optionalText(body.templateId, "templateId", 191);
  if (!Object.keys(data).length) throw new ValidationError("Aucun champ modifiable fourni.");
  return data;
}

function validateCreatePage(body = {}) {
  const type = pageType(body.type);
  const title = requiredText(body.title, "title", 180);
  return { title, slug: normalizeSlug(body.slug, type === "HOME" ? "" : title, "slug", type === "HOME"), type, seoTitle: optionalText(body.seoTitle, "seoTitle", 70), seoDesc: optionalText(body.seoDesc, "seoDesc", 180), content: jsonObject(body.content), published: Boolean(body.published) };
}

function validateUpdatePage(body = {}) {
  const data = {};
  if (body.title !== undefined) data.title = requiredText(body.title, "title", 180);
  if (body.slug !== undefined) data.slug = normalizeSlug(body.slug, body.slug, "slug", body.slug === "");
  if (body.type !== undefined) data.type = pageType(body.type);
  if (body.seoTitle !== undefined) data.seoTitle = optionalText(body.seoTitle, "seoTitle", 70);
  if (body.seoDesc !== undefined) data.seoDesc = optionalText(body.seoDesc, "seoDesc", 180);
  if (body.content !== undefined) data.content = jsonObject(body.content);
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (!Object.keys(data).length) throw new ValidationError("Aucun champ modifiable fourni.");
  return data;
}

function validateDestinationCluster(body = {}) {
  const destination = requiredText(body.destination, "destination", 100);
  const price = body.priceFrom === undefined || body.priceFrom === null || body.priceFrom === "" ? null : Number(body.priceFrom);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000)) throw new ValidationError("Le champ priceFrom doit être un montant positif valide.", { field: "priceFrom" });
  const highlights = body.highlights === undefined ? [] : body.highlights;
  if (!Array.isArray(highlights) || highlights.length > 12) throw new ValidationError("Le champ highlights doit contenir au maximum 12 éléments.", { field: "highlights" });
  const normalizedHighlights = highlights.map((item, index) => requiredText(item, `highlights[${index}]`, 180));
  const faq = body.faq === undefined ? [] : body.faq;
  if (!Array.isArray(faq) || faq.length > 20) throw new ValidationError("Le champ faq doit contenir au maximum 20 questions.", { field: "faq" });
  const normalizedFaq = faq.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ValidationError(`faq[${index}] doit être un objet.`, { field: `faq[${index}]` });
    return { question: requiredText(item.question, `faq[${index}].question`, 200), answer: requiredText(item.answer, `faq[${index}].answer`, 1200) };
  });
  return {
    destination,
    country: optionalText(body.country, "country", 100),
    departureCity: optionalText(body.departureCity, "departureCity", 100),
    priceFrom: price,
    duration: optionalText(body.duration, "duration", 100),
    offerUrl: optionalText(body.offerUrl, "offerUrl", 500),
    highlights: normalizedHighlights,
    faq: normalizedFaq,
    overwrite: body.overwrite === true,
  };
}

module.exports = { validateCreateSite, validateUpdateSite, validateCreatePage, validateUpdatePage, validateDestinationCluster };
