"use strict";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function agencyLabel(agency = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name);
  return { city, name: name || (city ? `Mondescale ${city}` : "Mondescale") };
}

function pageIntent(page = {}) {
  const source = normalize(`${page.slug || ""} ${page.title || ""}`);
  if (["", "home", "accueil"].includes(normalize(page.slug))) return { key: "home", label: "Agence de voyages", service: "voyages" };
  if (source.includes("agence") || source.includes("contact")) return { key: "agency", label: "Votre agence de voyages", service: "voyages" };
  if (source.includes("croisi")) return { key: "cruise", label: "Croisières", service: "croisières" };
  if (source.includes("circuit")) return { key: "circuit", label: "Circuits", service: "circuits" };
  if (source.includes("sur mesure") || source.includes("sur-mesure")) return { key: "custom", label: "Voyages sur mesure", service: "voyages sur mesure" };
  if (source.includes("sejour") || source.includes("club")) return { key: "stay", label: "Séjours", service: "séjours" };
  if (source.includes("billet") || source.includes("vol")) return { key: "ticketing", label: "Billetterie et vols", service: "billetterie et vols" };
  return { key: "generic", label: clean(page.title) || "Voyages", service: clean(page.title).toLowerCase() || "voyages" };
}

function buildHeroTitle({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city) return clean(page.title) || name;
  if (intent.key === "home") return `Agence de voyages à ${city}`;
  if (intent.key === "agency") return `Votre agence de voyages à ${city}`;
  if (intent.key !== "generic") return `${intent.label} à ${city}`;
  return clean(page.title) || name;
}

function buildLocalIntroduction({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city) return "";
  if (intent.key === "home") {
    return `${name} vous accompagne à ${city} pour imaginer et réserver vos voyages, séjours, circuits, croisières et projets sur mesure, avec les conseils d’une équipe de proximité.`;
  }
  if (intent.key === "agency") {
    return `Retrouvez l’équipe ${name} à ${city} pour préparer votre prochain voyage, comparer les solutions adaptées à votre projet et bénéficier d’un accompagnement avant, pendant et après votre départ.`;
  }
  if (intent.key !== "generic") {
    return `Vous recherchez des ${intent.service} à ${city} ? L’équipe ${name} vous conseille, compare les solutions adaptées à vos envies et à votre budget, puis vous accompagne jusqu’à votre retour.`;
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

module.exports = { buildHeroTitle, buildLocalIntroduction, optimizePageContent, pageIntent };
