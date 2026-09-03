"use strict";

const { INTENTS } = require("./local-search-intent-coverage");
const { auditLocalIntentTargetMapping } = require("./local-intent-target-mapping");

function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function contentText(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(contentText).join(" "); if (typeof value === "object") return Object.values(value).map(contentText).join(" "); return String(value); }
function containsAny(value, terms) { const text = ` ${normalize(value)} `; return (terms || []).some((term) => text.includes(` ${normalize(term)} `)); }
function containsCity(value, city) { const needle = normalize(city); return Boolean(needle) && ` ${normalize(value)} `.includes(` ${needle} `); }
function blockType(block = {}) { return normalize(block.blockType || block.type).replace(/\s+/g, "-"); }
function headingFromContent(content = {}) { return [content.h1, content.heading, content.title, content.headline].find((value) => typeof value === "string" && value.trim())?.trim() || ""; }
function firstHeading(blocks) {
  const items = Array.isArray(blocks) ? blocks : [];
  const hero = items.find((block) => blockType(block) === "hero");
  if (hero) {
    const heading = headingFromContent(hero.content || {});
    if (heading) return heading;
  }
  for (const block of items) {
    const heading = headingFromContent(block?.content || {});
    if (heading) return heading;
  }
  return "";
}
function wordCount(value) { return normalize(value).split(/\s+/).filter(Boolean).length; }
function publishedPages(site) { return (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published"); }

function qualityForTarget(page, city, intent) {
  const title = page?.seoTitle || page?.title || "";
  const meta = page?.metaDescription || "";
  const h1 = firstHeading(page?.blocks || []);
  const body = (page?.blocks || []).map((block) => contentText(block?.content)).join(" ");
  const titleQualified = containsCity(title, city) && containsAny(title, intent.terms);
  const metaQualified = containsCity(meta, city) && containsAny(meta, intent.terms);
  const h1Qualified = containsCity(h1, city) && containsAny(h1, intent.terms);
  const bodyQualified = containsCity(body, city) && containsAny(body, intent.terms);
  const words = wordCount(body);
  const sufficientDepth = words >= 120;
  const score = (titleQualified ? 25 : 0) + (metaQualified ? 15 : 0) + (h1Qualified ? 25 : 0) + (bodyQualified ? 20 : 0) + (sufficientDepth ? 15 : 0);
  return { slug: String(page?.slug || "").trim() || "accueil", score, status: score >= 80 ? "strong" : score >= 60 ? "partial" : "weak", titleQualified, metaQualified, h1Qualified, bodyQualified, sufficientDepth, wordCount: words };
}

function auditLocalIntentTargetQuality(site) {
  const city = String(site?.agency?.city || "").trim();
  const mapping = auditLocalIntentTargetMapping(site);
  const pages = publishedPages(site);
  const intents = mapping.intents.map((mappedIntent) => {
    const intent = INTENTS.find((item) => item.key === mappedIntent.key) || mappedIntent;
    const qualities = (mappedIntent.targets || []).map((target) => {
      const page = pages.find((item) => (String(item?.slug || "").trim() || "accueil") === target.slug);
      return page ? qualityForTarget(page, city, intent) : null;
    }).filter(Boolean);
    const best = qualities.sort((a, b) => b.score - a.score)[0] || null;
    return { key: mappedIntent.key, label: mappedIntent.label, mapped: mappedIntent.mapped, bestTarget: best, targets: qualities, qualityStatus: best?.status || "missing", qualityScore: best?.score || 0 };
  });
  const mapped = intents.filter((intent) => intent.mapped);
  const averageScore = mapped.length ? Math.round(mapped.reduce((sum, intent) => sum + intent.qualityScore, 0) / mapped.length) : 0;
  const core = intents.find((intent) => intent.key === "agency") || null;
  const gaps = [];
  for (const intent of intents) {
    if (!intent.mapped || !intent.bestTarget) continue;
    if (intent.qualityStatus === "weak") gaps.push({ code: `local-intent-${intent.key}-target-quality-weak`, severity: intent.key === "agency" ? "high" : "medium", intent: intent.key, pageSlug: intent.bestTarget.slug, message: `La page /${intent.bestTarget.slug} porte l’intention « ${intent.label} » mais sa qualité SEO locale est insuffisante (${intent.qualityScore}/100).` });
    else if (intent.qualityStatus === "partial") gaps.push({ code: `local-intent-${intent.key}-target-quality-partial`, severity: intent.key === "agency" ? "medium" : "low", intent: intent.key, pageSlug: intent.bestTarget.slug, message: `La page /${intent.bestTarget.slug} porte l’intention « ${intent.label} » mais peut être renforcée (${intent.qualityScore}/100).` });
  }
  return { city: city || null, score: averageScore, status: averageScore >= 80 ? "strong" : averageScore >= 60 ? "partial" : "weak", coreTargetQuality: core?.bestTarget || null, coreTargetStrong: core?.qualityStatus === "strong", intents, gaps };
}

module.exports = { auditLocalIntentTargetQuality, qualityForTarget, wordCount, firstHeading };
