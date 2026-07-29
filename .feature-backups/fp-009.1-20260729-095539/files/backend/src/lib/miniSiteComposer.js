"use strict";

const { recommendationScore, deduplicateRanked } = require("./knowledgeEngine");

const DEFAULT_ORDER = Object.freeze([
  "breadcrumb", "hero", "intro", "highlights", "climate", "cards", "faq",
  "destination-recommendations", "contact-cta",
]);

function asArray(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function cleanText(value) { return String(value || "").trim(); }
function metadataOf(destination) { return destination?.metadata && typeof destination.metadata === "object" ? destination.metadata : {}; }
function sectionByKey(destination, key) { return asArray(destination?.sections).find((section) => section.key === key || section.type === key); }
function sectionContent(destination, key) { const section = sectionByKey(destination, key); return section?.content && typeof section.content === "object" ? section.content : {}; }

function buildContext(destination, site, agency = null) {
  const meta = metadataOf(destination);
  return {
    destination: cleanText(destination?.name),
    country: cleanText(destination?.countryRef?.name || destination?.country),
    region: cleanText(destination?.regionRef?.name || destination?.region),
    city: cleanText(destination?.cityRef?.name),
    siteName: cleanText(site?.name),
    siteSlug: cleanText(site?.slug),
    agencyName: cleanText(agency?.name || site?.agency?.name || site?.name),
    phone: cleanText(agency?.phone || site?.agency?.phone),
    email: cleanText(agency?.email || site?.agency?.email),
    whatsapp: cleanText(meta.whatsapp || agency?.whatsapp),
  };
}

function buildRecommendations(destination, candidates = [], limit = 6) {
  const explicit = asArray(destination?.relationsFrom).map((relation) => ({
    id: relation.target?.id,
    slug: relation.target?.slug,
    name: relation.target?.name,
    score: Number(relation.score) || 0,
    reasons: [relation.relationType || "related"],
    origin: relation.origin || "manual",
  })).filter((item) => item.id && item.slug && item.name);

  const computed = asArray(candidates).filter((candidate) => candidate.id !== destination?.id).map((candidate) => {
    const ranked = recommendationScore(destination || {}, candidate);
    return { id: candidate.id, slug: candidate.slug, name: candidate.name, score: ranked.score, reasons: ranked.reasons, origin: "computed" };
  }).filter((item) => item.score > 0 && item.slug && item.name);

  return deduplicateRanked([...explicit, ...computed], limit);
}

function actionList(context) {
  const actions = [{ label: "Demander un devis", href: `${context.siteSlug ? `/agence/${context.siteSlug}` : ""}/contact` }];
  if (context.phone) actions.push({ label: "Appeler l’agence", href: `tel:${context.phone.replace(/\s+/g, "")}` });
  if (context.whatsapp) actions.push({ label: "WhatsApp", href: `https://wa.me/${context.whatsapp.replace(/\D+/g, "")}` });
  return actions;
}

function composeDestinationSections({ destination, site, agency, candidates = [], options = {} }) {
  if (!destination?.name || !destination?.slug) throw new Error("A published destination with name and slug is required");
  const context = buildContext(destination, site, agency);
  const meta = metadataOf(destination);
  const recommendations = buildRecommendations(destination, candidates, options.recommendationLimit || 6);
  const highlights = asArray(destination.highlights);
  const themes = asArray(destination.themes).map((item) => item.theme || item).filter(Boolean);
  const travelTypes = asArray(destination.travelTypes).map((item) => item.travelType || item).filter(Boolean);
  const faq = asArray(destination.faqs).map((item) => ({ question: cleanText(item.question), answer: cleanText(item.answer) })).filter((item) => item.question && item.answer);
  const climate = { ...sectionContent(destination, "climate"), bestTime: destination.bestTime || meta.bestTime, idealDuration: destination.idealDuration || meta.idealDuration };

  const sections = [
    { sectionType: "breadcrumb", jsonContent: { items: [
      { name: "Accueil", href: `/agence/${context.siteSlug}` },
      { name: "Destinations", href: `/agence/${context.siteSlug}/destinations` },
      { name: context.destination, href: `/agence/${context.siteSlug}/destination/${destination.slug}` },
    ] } },
    { sectionType: "hero", jsonContent: { eyebrow: context.country || context.region || "Destination", title: destination.tagline || `Voyage à ${context.destination}`, text: destination.summary || `Préparez votre voyage à ${context.destination} avec ${context.agencyName}.`, imageUrl: destination.heroImageUrl || meta.heroImageUrl, primaryCta: actionList(context)[0], secondaryCta: actionList(context)[1] } },
    { sectionType: "intro", jsonContent: { title: `Découvrir ${context.destination}`, text: destination.summary || `Nos conseillers vous accompagnent pour construire un voyage à ${context.destination} adapté à vos envies.`, paragraphs: asArray(sectionContent(destination, "intro").paragraphs) } },
    { sectionType: "highlights", jsonContent: { title: `Pourquoi partir à ${context.destination} ?`, items: highlights.map((title) => ({ title })) } },
    { sectionType: "climate", jsonContent: { title: `Quand partir à ${context.destination} ?`, ...climate } },
    { sectionType: "cards", jsonContent: { title: `Nos idées de voyage à ${context.destination}`, items: [
      ...travelTypes.map((item) => ({ title: item.name, text: item.description || `Découvrez nos offres ${item.name.toLowerCase()} à ${context.destination}.` })),
      ...themes.map((item) => ({ title: item.name, text: item.description || `Explorez ${context.destination} sous le thème ${item.name.toLowerCase()}.` })),
    ].slice(0, options.cardLimit || 8) } },
    { sectionType: "faq", jsonContent: { title: `Questions fréquentes sur ${context.destination}`, items: faq } },
    { sectionType: "destination-recommendations", jsonContent: { title: "Vous aimerez aussi", items: recommendations.map((item) => ({ title: item.name, href: `/agence/${context.siteSlug}/destination/${item.slug}`, score: item.score, reasons: item.reasons })) } },
    { sectionType: "contact-cta", jsonContent: { title: `Construisons votre voyage à ${context.destination}`, text: `Échangez avec ${context.agencyName} pour obtenir une proposition personnalisée.`, actions: actionList(context) } },
  ];

  return sections.filter((section) => {
    const content = section.jsonContent || {};
    if (["highlights", "cards", "faq", "destination-recommendations"].includes(section.sectionType)) return asArray(content.items).length > 0;
    return true;
  }).map((section, index) => ({ ...section, displayOrder: index, status: options.status || "draft" }));
}

function composeDestinationPage({ destination, site, agency, candidates = [], options = {} }) {
  const context = buildContext(destination, site, agency);
  const title = destination.seoTitle || `Voyage à ${context.destination} avec ${context.agencyName}`;
  const description = destination.seoDescription || destination.summary || `Découvrez ${context.destination} et préparez votre voyage avec ${context.agencyName}.`;
  return {
    title: context.destination,
    slug: destination.slug,
    path: `/agence/${context.siteSlug}/destination/${destination.slug}`,
    pageType: "destination",
    menuTitle: context.destination,
    menuLocation: "destinations",
    displayOrder: Number(options.displayOrder) || 100,
    seoTitle: title.slice(0, 70),
    metaDescription: description.slice(0, 180),
    h1: destination.tagline || `Voyage à ${context.destination}`,
    schemaType: "TouristDestination",
    status: options.status || "draft",
    published: options.status === "published",
    sections: composeDestinationSections({ destination, site, agency, candidates, options }),
  };
}

module.exports = { DEFAULT_ORDER, buildContext, buildRecommendations, composeDestinationSections, composeDestinationPage };
