"use strict";

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function clamp(value, max) { const text = clean(value); if (text.length <= max) return text; return `${text.slice(0, Math.max(0, max - 1)).replace(/[\s,;:.-]+$/g, "")}…`; }
function agencyName(site) { return clean(site?.agency?.name || site?.name || "Mondescale Voyages"); }
function cityName(site, page) { return clean(page?.localCity || site?.seoCity || site?.agency?.city); }
function intentFor(page) {
  const type = clean(page?.pageType).toLowerCase();
  const title = clean(page?.title).toLowerCase();
  if (/croisi/.test(type + title)) return { noun: "Croisières", service: "croisières" };
  if (/circuit/.test(type + title)) return { noun: "Circuits", service: "circuits" };
  if (/sur.?mesure|custom/.test(type + title)) return { noun: "Voyages sur mesure", service: "voyages sur mesure" };
  if (/billet|vol|flight/.test(type + title)) return { noun: "Billetterie et vols", service: "billetterie et vols" };
  if (/sejour|séjour|club/.test(type + title)) return { noun: "Séjours", service: "séjours" };
  return { noun: "Agence de voyages", service: "voyages" };
}

function buildLocalPageOptimization(site, page) {
  const city = cityName(site, page); const brand = agencyName(site); const intent = intentFor(page);
  if (!city) throw new Error("LOCAL_SEO_OPTIMIZER_CITY_REQUIRED");
  const homepage = ["", "/", "accueil", "home"].includes(clean(page?.slug).toLowerCase()) || clean(page?.pageType).toLowerCase() === "home";
  const seoTitle = clamp(homepage ? `Agence de voyages à ${city} | ${brand}` : `${intent.noun} à ${city} | ${brand}`, 60);
  const h1 = homepage ? `Votre agence de voyages à ${city}` : `${intent.noun} à ${city} avec nos conseillers voyages`;
  const seoDescription = clamp(homepage ? `Préparez votre prochain voyage avec ${brand} à ${city} : conseils personnalisés, séjours, circuits, croisières et voyages sur mesure.` : `Découvrez nos ${intent.service} au départ de ${city}. ${brand} vous conseille et construit avec vous un projet adapté à vos envies et à votre budget.`, 160);
  const introduction = homepage ? `${brand} vous accueille à ${city} pour concevoir vos vacances avec un conseiller voyage. Notre équipe vous accompagne pour vos séjours, circuits, croisières, billets d’avion et voyages sur mesure, avec un conseil humain avant, pendant et après votre réservation.` : `Vous recherchez ${intent.service} à ${city} ? L’équipe ${brand} vous accompagne dans le choix et la préparation de votre projet. Nous comparons les solutions adaptées à vos envies, à votre budget et à vos dates, puis restons disponibles jusqu’à votre retour.`;
  return { seoTitle, seoDescription, h1, introduction, localCity: city, optimization: { version: "mse-25.30", mode: "deterministic-draft", intent: intent.service, homepage, requiresHumanReview: true, autoPublish: false } };
}

function buildOptimizationPatch(page, proposal) {
  const content = page?.content && typeof page.content === "object" && !Array.isArray(page.content) ? { ...page.content } : {};
  return { seoTitle: proposal.seoTitle, seoDescription: proposal.seoDescription, introduction: proposal.introduction, localCity: proposal.localCity, content: { ...content, h1: proposal.h1, seoOptimization: proposal.optimization } };
}

function wordCount(value) {
  const text = clean(value).replace(/<[^>]+>/g, " ");
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function isPublishedIndexablePage(page) {
  if (!page || page.published === false || page.isPublished === false) return false;
  if (page.noindex === true || page.indexable === false) return false;
  const slug = clean(page.slug).replace(/^\/+|\/+$/g, "");
  return Boolean(slug);
}

function pageHref(page) {
  const explicit = clean(page.path || page.href || page.publicPath);
  if (explicit) return explicit.startsWith("/") ? explicit : `/${explicit}`;
  const slug = clean(page.slug).replace(/^\/+|\/+$/g, "");
  return slug ? `/${slug}` : "/";
}

function buildQualityParagraph(site, page) {
  const city = cityName(site, page);
  const brand = agencyName(site);
  const intent = intentFor(page);
  if (!city) throw new Error("LOCAL_SEO_QUALITY_CITY_REQUIRED");
  return `${brand} à ${city} vous aide à comparer les options de ${intent.service} selon vos dates, votre budget et vos priorités. Votre conseiller peut aussi coordonner les prestations complémentaires utiles au voyage et vous accompagner jusqu’au départ, avec un interlocuteur local pour vos questions et ajustements.`;
}

function buildInternalLinkSuggestions(page, publishedPages = []) {
  const currentHref = pageHref(page);
  const existingText = clean([page?.introduction, page?.body, page?.text, page?.content?.html, page?.content?.text].filter(Boolean).join(" ")).toLowerCase();
  const candidates = publishedPages
    .filter(isPublishedIndexablePage)
    .filter((candidate) => pageHref(candidate) !== currentHref)
    .map((candidate) => ({
      id: candidate.id || null,
      href: pageHref(candidate),
      title: clean(candidate.title || intentFor(candidate).noun),
      intent: intentFor(candidate).service,
    }))
    .filter((candidate) => candidate.title && !existingText.includes(candidate.href.toLowerCase()))
    .sort((a, b) => a.href.localeCompare(b.href));

  const priority = ["voyages sur mesure", "séjours", "circuits", "croisières", "billetterie et vols", "voyages"];
  candidates.sort((a, b) => {
    const ai = priority.indexOf(a.intent); const bi = priority.indexOf(b.intent);
    const ar = ai === -1 ? 99 : ai; const br = bi === -1 ? 99 : bi;
    return ar - br || a.href.localeCompare(b.href);
  });

  const seenAnchors = new Set();
  return candidates.filter((candidate) => {
    const anchor = clean(candidate.title).toLowerCase();
    if (seenAnchors.has(anchor)) return false;
    seenAnchors.add(anchor);
    return true;
  }).slice(0, 3);
}

function buildLocalQualityUplift(site, page, options = {}) {
  const thresholdWords = Number.isFinite(options.thinContentThresholdWords) ? options.thinContentThresholdWords : 90;
  const existingBody = clean([page?.introduction, page?.body, page?.text, page?.content?.html, page?.content?.text].filter(Boolean).join(" "));
  const existingWords = wordCount(existingBody);
  const thinContent = existingWords < thresholdWords;
  const manualIntroductionPresent = clean(page?.introduction).length > 0 && page?.content?.seoOptimization?.version !== "mse-25.30";
  const qualityParagraph = thinContent && !manualIntroductionPresent ? buildQualityParagraph(site, page) : null;
  const internalLinks = buildInternalLinkSuggestions(page, Array.isArray(options.publishedPages) ? options.publishedPages : []);

  return {
    version: "mse-25.31",
    mode: "deterministic-quality-uplift",
    existingWords,
    thinContentThresholdWords: thresholdWords,
    thinContent,
    preservesManualIntroduction: manualIntroductionPresent,
    suggestedParagraph: qualityParagraph,
    internalLinks,
    warningsTargeted: [
      ...(thinContent ? ["THIN_CONTENT"] : []),
      ...(internalLinks.length ? ["EDITORIAL_INTERNAL_LINK_MISSING"] : []),
      "local-secondary-intent-target-quality-weak",
    ],
    requiresHumanReview: true,
    autoPublish: false,
  };
}

module.exports = { buildLocalPageOptimization, buildOptimizationPatch, buildLocalQualityUplift, buildInternalLinkSuggestions, wordCount, intentFor };
