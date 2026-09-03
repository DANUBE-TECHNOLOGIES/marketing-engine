"use strict";
const crypto = require("crypto");
function textFromContent(content) {
  if (!content) return [];
  if (typeof content === "string") return [content];
  if (Array.isArray(content)) return content.flatMap(textFromContent);
  if (typeof content === "object") return Object.values(content).flatMap(textFromContent);
  return [];
}
function sourceMaterial(destination) {
  const sectionText = (destination.sections || []).flatMap((s) => textFromContent(s.content));
  return [destination.summary, destination.tagline, ...sectionText].filter(Boolean);
}
function metaDescription(title, destination) {
  const base = destination.summary || `Préparez votre voyage à ${destination.name} avec les conseils de votre agence Mondescale Voyages.`;
  return `${title}. ${base}`.replace(/\s+/g, " ").slice(0, 155);
}
function sectionsFor(page, destination) {
  const sources = sourceMaterial(destination);
  const highlights = Array.isArray(destination.highlights) ? destination.highlights : [];
  const intro = sources[0] || `${destination.name} offre une expérience riche, entre découvertes, culture et art de vivre.`;
  const sections = [
    { sectionType: "hero", displayOrder: 10, content: { eyebrow: destination.country, title: page.title, introduction: intro, imageUrl: destination.heroImageUrl || null } },
    { sectionType: "overview", displayOrder: 20, content: { title: `L'essentiel pour ${page.title.toLowerCase()}`, paragraphs: sources.slice(0, 3) } },
  ];
  if (highlights.length) sections.push({ sectionType: "highlights", displayOrder: 30, content: { title: "Les incontournables", items: highlights.slice(0, 8).map((title) => ({ title })) } });
  if (destination.bestTime || destination.idealDuration) sections.push({ sectionType: "practical", displayOrder: 40, content: { title: "Informations pratiques", bestTime: destination.bestTime || null, idealDuration: destination.idealDuration || null, currency: destination.currency || null, language: destination.language || null } });
  if ((destination.faqs || []).length) sections.push({ sectionType: "faq", displayOrder: 50, content: { title: `FAQ ${destination.name}`, items: destination.faqs.slice(0, 8).map((f) => ({ question: f.question, answer: f.answer })) } });
  sections.push({ sectionType: "cta", displayOrder: 90, content: { title: `Construisons votre voyage à ${destination.name}`, text: "Votre conseiller Mondescale vous accompagne avant, pendant et après votre séjour.", action: "Demander un devis" } });
  return sections;
}
function composePage(page, destination, site) {
  const path = `${String(site.basePath || "").replace(/\/$/, "")}/${page.slug}`.replace(/\/+/g, "/");
  const sections = sectionsFor(page, destination);
  const result = {
    ...page,
    path,
    pageType: page.role === "pillar" ? "destination" : "destination-cluster",
    menuTitle: page.title,
    menuLocation: page.role === "pillar" ? "main" : "cluster",
    displayOrder: page.priority * 10,
    seoTitle: `${page.title} | Mondescale Voyages`.slice(0, 60),
    metaDescription: metaDescription(page.title, destination),
    h1: page.title,
    schemaType: page.role === "pillar" ? "TouristDestination" : "Article",
    sections,
  };
  result.contentHash = crypto.createHash("sha256").update(JSON.stringify(result)).digest("hex");
  return result;
}
module.exports = { composePage, sectionsFor, sourceMaterial };
