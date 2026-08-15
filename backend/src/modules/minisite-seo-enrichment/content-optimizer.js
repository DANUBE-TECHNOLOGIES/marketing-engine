"use strict";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function agencyLabel(agency = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name);
  return { city, name: name || (city ? `Mondescale ${city}` : "Mondescale") };
}

function pageIntent(page = {}) {
  const slug = clean(page.slug).toLowerCase();
  if (["home", "accueil", ""].includes(slug)) return "home";
  if (slug.includes("agence") || slug.includes("contact")) return "agency";
  return "generic";
}

function buildHeroTitle({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (intent === "home" && city) return `Agence de voyages à ${city}`;
  if (intent === "agency" && city) return `Votre agence de voyages à ${city}`;
  return clean(page.title) || name;
}

function buildLocalIntroduction({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city) return "";
  if (intent === "home") {
    return `${name} vous accompagne à ${city} pour imaginer et réserver vos voyages, séjours, circuits, croisières et projets sur mesure, avec les conseils d’une équipe de proximité.`;
  }
  if (intent === "agency") {
    return `Retrouvez l’équipe ${name} à ${city} pour préparer votre prochain voyage, comparer les solutions adaptées à votre projet et bénéficier d’un accompagnement avant, pendant et après votre départ.`;
  }
  return `L’équipe ${name} à ${city} vous conseille pour préparer un voyage adapté à vos envies et à votre budget.`;
}

function optimizePageContent({ agency = {}, page = {}, blocks = [] } = {}) {
  const nextBlocks = (blocks || []).map((block) => ({ ...block, content: { ...(block.content || {}) } }));
  const changes = [];
  const heroIndex = nextBlocks.findIndex((block) => block.blockType === "hero" || block.type === "hero");

  if (heroIndex >= 0) {
    const hero = nextBlocks[heroIndex];
    const previousTitle = clean(hero.content.title);
    const nextTitle = buildHeroTitle({ agency, page });
    if (nextTitle && previousTitle !== nextTitle) {
      hero.content.title = nextTitle;
      changes.push({ blockId: hero.id || null, blockType: "hero", field: "title", previous: previousTitle, next: nextTitle });
    }

    const previousSubtitle = clean(hero.content.subtitle);
    if (!previousSubtitle) {
      const nextSubtitle = buildLocalIntroduction({ agency, page });
      if (nextSubtitle) {
        hero.content.subtitle = nextSubtitle;
        changes.push({ blockId: hero.id || null, blockType: "hero", field: "subtitle", previous: previousSubtitle, next: nextSubtitle });
      }
    }
  }

  return {
    changed: changes.length > 0,
    changes,
    blocks: nextBlocks,
  };
}

module.exports = { buildHeroTitle, buildLocalIntroduction, optimizePageContent };
