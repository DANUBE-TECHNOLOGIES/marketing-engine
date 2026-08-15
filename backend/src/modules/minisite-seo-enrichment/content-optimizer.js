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

function blockType(block = {}) {
  return normalize(block.blockType || block.type).replace(/[_\s]+/g, "-");
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

function buildLocalSectionTitle({ agency, page }) {
  const { city } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city) return "";
  const titles = {
    home: `Des voyages conçus avec votre agence à ${city}`,
    agency: `Une équipe de proximité pour vos voyages à ${city}`,
    cruise: `Votre spécialiste des croisières à ${city}`,
    circuit: `Votre spécialiste des circuits à ${city}`,
    custom: `Votre voyage sur mesure à ${city}, pensé avec un conseiller`,
    stay: `Votre spécialiste des séjours à ${city}`,
    ticketing: `Billetterie et vols : votre conseiller à ${city}`,
  };
  return titles[intent.key] || (clean(page.title) ? `${clean(page.title)} à ${city}` : "");
}

function buildLocalSectionText({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city) return "";
  if (intent.key === "home") {
    return `À ${city}, l’équipe ${name} prend le temps de comprendre votre projet avant de comparer les destinations, les voyagistes et les formules disponibles. Vous bénéficiez d’un interlocuteur de proximité pour construire, réserver et suivre votre voyage.`;
  }
  if (intent.key === "agency") {
    return `Notre équipe à ${city} vous accueille pour étudier votre projet, comparer les solutions et sécuriser chaque étape de votre réservation. Conseils, formalités, suivi du dossier et assistance : vous gardez un interlocuteur identifié jusqu’à votre retour.`;
  }
  if (intent.key !== "generic") {
    return `Pour vos ${intent.service} à ${city}, ${name} sélectionne avec vous les solutions adaptées à votre budget, à vos dates et à votre façon de voyager. Notre équipe vous aide à comparer les offres et reste disponible pour le suivi de votre dossier.`;
  }
  return `À ${city}, ${name} vous accompagne avec des conseils personnalisés et un suivi de proximité pour préparer votre prochain voyage.`;
}

function commercialPages(availablePages = []) {
  const seen = new Set();
  return (availablePages || [])
    .map((candidate) => ({ candidate, intent: pageIntent(candidate) }))
    .filter(({ candidate, intent }) => {
      const slug = clean(candidate.slug);
      if (!slug || !["cruise", "circuit", "custom", "stay", "ticketing"].includes(intent.key) || seen.has(intent.key)) return false;
      seen.add(intent.key);
      return true;
    })
    .map(({ candidate, intent }) => ({
      title: intent.label,
      description: clean(candidate.title) && normalize(candidate.title) !== normalize(intent.label) ? clean(candidate.title) : undefined,
      href: clean(candidate.slug),
      seoInternalLink: true,
    }));
}

function hasEditorialCopy(content = {}) {
  return Boolean(
    clean(content.text) ||
    clean(content.description) ||
    clean(content.html) ||
    (Array.isArray(content.paragraphs) && content.paragraphs.some((value) => clean(value)))
  );
}

function optimizeEditorialBlock(nextBlocks, { agency, page, changes }) {
  const editorialTypes = new Set(["rich-text", "richtext", "image-text", "agency", "features"]);
  const index = nextBlocks.findIndex((block) => editorialTypes.has(blockType(block)));
  if (index < 0) return;

  const block = nextBlocks[index];
  const previousTitle = clean(block.content.title || block.content.heading || block.title);
  if (!previousTitle) {
    const nextTitle = buildLocalSectionTitle({ agency, page });
    if (nextTitle) {
      block.content.title = nextTitle;
      changes.push({ blockId: block.id || null, blockType: blockType(block), field: "title", previous: "", next: nextTitle });
    }
  }

  if (!hasEditorialCopy(block.content)) {
    const nextText = buildLocalSectionText({ agency, page });
    if (nextText) {
      block.content.text = nextText;
      changes.push({ blockId: block.id || null, blockType: blockType(block), field: "text", previous: "", next: nextText });
    }
  }
}

function optimizeCommercialLinks(nextBlocks, { page, availablePages, changes }) {
  if (!new Set(["home", "agency"]).has(pageIntent(page).key)) return;
  const links = commercialPages(availablePages).filter((link) => normalize(link.href) !== normalize(page.slug));
  if (!links.length) return;

  const index = nextBlocks.findIndex((block) => ["cards", "services"].includes(blockType(block)));
  if (index < 0) return;
  const block = nextBlocks[index];
  const field = Array.isArray(block.content.items) ? "items" : Array.isArray(block.content.cards) ? "cards" : null;
  if (!field) return;

  const items = block.content[field].map((item) => ({ ...item }));
  let changed = false;
  for (const link of links) {
    const existingIndex = items.findIndex((item) => normalize(item.title || item.name || item.label) === normalize(link.title));
    if (existingIndex < 0) continue;
    if (!clean(items[existingIndex].href)) {
      items[existingIndex].href = link.href;
      items[existingIndex].seoInternalLink = true;
      changes.push({
        blockId: block.id || null,
        blockType: blockType(block),
        field: `${field}.${existingIndex}.href`,
        previous: "",
        next: link.href,
      });
      changed = true;
    }
  }
  if (changed) block.content[field] = items;
}

function optimizePageContent({ agency = {}, page = {}, blocks = [], availablePages = [] } = {}) {
  const nextBlocks = (blocks || []).map((block) => ({ ...block, content: { ...(block.content || {}) } }));
  const changes = [];
  const heroIndex = nextBlocks.findIndex((block) => blockType(block).includes("hero"));

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

  optimizeEditorialBlock(nextBlocks, { agency, page, changes });
  optimizeCommercialLinks(nextBlocks, { page, availablePages, changes });

  return {
    changed: changes.length > 0,
    changes,
    blocks: nextBlocks,
  };
}

module.exports = {
  buildHeroTitle,
  buildLocalIntroduction,
  buildLocalSectionTitle,
  buildLocalSectionText,
  commercialPages,
  optimizePageContent,
  pageIntent,
};
