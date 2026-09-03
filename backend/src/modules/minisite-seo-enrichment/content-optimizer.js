"use strict";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stableVariant(value, count) {
  const source = normalize(value);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
  }
  return count > 0 ? hash % count : 0;
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

function isCommercialIntent(intent) {
  return ["cruise", "circuit", "custom", "stay", "ticketing"].includes(intent?.key);
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

  const variant = stableVariant(`${name}|${city}|${page.slug || page.title || intent.key}|intro`, 5);

  if (intent.key === "home") {
    const variants = [
      `${name} vous accompagne à ${city} pour imaginer et réserver vos voyages, séjours, circuits, croisières et projets sur mesure, avec les conseils d’une équipe de proximité.`,
      `À ${city}, ${name} vous aide à passer de l’idée au voyage concret : choix de la destination, comparaison des formules, réservation et suivi restent réunis auprès de la même équipe.`,
      `Depuis ${city}, l’équipe ${name} construit avec vous des voyages adaptés à vos dates, à votre budget et à votre façon de partir, du premier échange jusqu’au suivi avant le départ.`,
      `Votre agence ${name} à ${city} met le conseil humain au centre du projet : nous comparons les options utiles, expliquons les différences et suivons votre dossier jusqu’au voyage.`,
      `À ${city}, ${name} réunit dans une même agence conseil, sélection de partenaires et accompagnement pour vos séjours, circuits, croisières, billets et voyages personnalisés.`,
    ];
    return variants[variant];
  }

  if (intent.key === "agency") {
    const variants = [
      `Retrouvez l’équipe ${name} à ${city} pour préparer votre prochain voyage, comparer les solutions adaptées à votre projet et bénéficier d’un accompagnement avant, pendant et après votre départ.`,
      `Dans votre agence ${name} à ${city}, le projet commence par un échange sur vos priorités : dates, rythme, budget et envies servent ensuite à sélectionner les solutions réellement pertinentes.`,
      `L’équipe ${name} vous accueille à ${city} pour étudier votre voyage dans son ensemble, vérifier les options disponibles et garder un interlocuteur identifié pour le suivi de la réservation.`,
      `À ${city}, ${name} privilégie un conseil personnalisé : nous prenons le temps de comparer les offres, de préciser les conditions et d’accompagner chaque dossier jusqu’au retour.`,
      `Votre agence ${name} à ${city} vous aide à construire un voyage cohérent avec vos attentes, puis reste disponible pour les formalités, le suivi et les ajustements utiles avant le départ.`,
    ];
    return variants[variant];
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

  const variant = stableVariant(`${name}|${city}|${page.slug || page.title || intent.key}|section`, 5);

  if (intent.key === "home") {
    const variants = [
      `À ${city}, l’équipe ${name} prend le temps de comprendre votre projet avant de comparer les destinations, les voyagistes et les formules disponibles. Vous bénéficiez d’un interlocuteur de proximité pour construire, réserver et suivre votre voyage.`,
      `Chaque projet confié à ${name} à ${city} est étudié à partir de vos contraintes réelles : période de départ, durée, budget et niveau de confort. L’équipe sélectionne ensuite les solutions à comparer et assure le suivi de la réservation.`,
      `Notre agence de ${city} ne se limite pas à proposer un catalogue. L’équipe ${name} met en perspective les itinéraires, les hébergements et les conditions de voyage pour construire une recommandation adaptée à votre façon de partir.`,
      `À ${city}, ${name} combine connaissance des partenaires et accompagnement de proximité. Nous vous aidons à arbitrer entre plusieurs possibilités, puis nous restons disponibles pour les documents, formalités et informations utiles avant le départ.`,
      `L’équipe ${name} à ${city} accompagne aussi bien les projets simples que les voyages nécessitant plusieurs prestations. Le même conseiller peut suivre le dossier de la première recherche jusqu’aux dernières vérifications avant votre départ.`,
    ];
    return variants[variant];
  }

  if (intent.key === "agency") {
    const variants = [
      `Notre équipe à ${city} vous accueille pour étudier votre projet, comparer les solutions et sécuriser chaque étape de votre réservation. Conseils, formalités, suivi du dossier et assistance : vous gardez un interlocuteur identifié jusqu’à votre retour.`,
      `Chez ${name} à ${city}, le conseil commence par l’écoute du projet avant toute recherche. Nous clarifions ensemble les priorités, comparons les propositions pertinentes puis suivons les étapes de réservation et les informations de départ.`,
      `Votre agence ${name} à ${city} vous accompagne avec une méthode simple : comprendre le besoin, sélectionner les options cohérentes, expliquer les différences puis assurer la continuité du dossier jusqu’au voyage.`,
      `À ${city}, l’équipe ${name} reste votre point de contact pour la préparation du voyage. Elle peut vous aider à vérifier les prestations, les conditions, les formalités et les échéances utiles tout au long du dossier.`,
      `L’agence ${name} à ${city} privilégie une relation suivie plutôt qu’une succession d’interlocuteurs. Le conseiller qui connaît votre projet peut ainsi vous guider dans les choix et rester disponible lorsque la réservation évolue.`,
    ];
    return variants[variant];
  }

  if (intent.key !== "generic") {
    return `Pour vos ${intent.service} à ${city}, ${name} sélectionne avec vous les solutions adaptées à votre budget, à vos dates et à votre façon de voyager. Notre équipe vous aide à comparer les offres et reste disponible pour le suivi de votre dossier.`;
  }
  return `À ${city}, ${name} vous accompagne avec des conseils personnalisés et un suivi de proximité pour préparer votre prochain voyage.`;
}

function buildCommercialProofs({ agency, page }) {
  const { city } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city || !isCommercialIntent(intent)) return [];

  const first = {
    cruise: ["Un itinéraire adapté", "Nous vous aidons à choisir l’itinéraire, la durée et le rythme de croisière adaptés à votre projet."],
    circuit: ["Un circuit adapté", "Nous étudions le rythme, les étapes et les prestations du circuit selon votre manière de voyager."],
    custom: ["Un projet vraiment personnalisé", "Nous partons de vos dates, de vos envies et de votre budget pour construire un voyage cohérent."],
    stay: ["Une formule adaptée", "Nous comparons destinations, hébergements et formules pour sélectionner un séjour cohérent avec vos attentes."],
    ticketing: ["Un itinéraire aérien étudié", "Nous vous aidons à comparer les itinéraires, horaires et conditions tarifaires utiles à votre voyage."],
  }[intent.key];

  return [
    { title: first[0], text: first[1] },
    { title: "Des solutions comparées", text: `Votre conseiller à ${city} met en perspective les solutions disponibles pour faciliter votre choix.` },
    { title: "Un suivi jusqu’au départ", text: "Votre agence reste votre interlocuteur pour le suivi du dossier et les informations utiles avant le voyage." },
  ];
}

function commercialPages(availablePages = []) {
  const seen = new Set();
  return (availablePages || [])
    .map((candidate) => ({ candidate, intent: pageIntent(candidate) }))
    .filter(({ candidate, intent }) => {
      const slug = clean(candidate.slug);
      if (!slug || !isCommercialIntent(intent) || seen.has(intent.key)) return false;
      seen.add(intent.key);
      return true;
    })
    .map(({ candidate, intent }) => ({
      title: intent.label,
      description: clean(candidate.title) && normalize(candidate.title) !== normalize(intent.label) ? clean(candidate.title) : undefined,
      href: clean(candidate.slug),
      intentKey: intent.key,
      seoInternalLink: true,
    }));
}

function relatedCommercialPage(page, availablePages = []) {
  const currentIntent = pageIntent(page);
  const pages = commercialPages(availablePages);
  if (!isCommercialIntent(currentIntent) || pages.length < 2) return null;
  const currentIndex = pages.findIndex((item) => item.intentKey === currentIntent.key);
  if (currentIndex < 0) return pages[0] || null;
  return pages[(currentIndex + 1) % pages.length] || null;
}

function buildCommercialCta({ agency, page, siteSlug, availablePages = [] }) {
  const { city } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city || !isCommercialIntent(intent)) return null;
  const contactHref = clean(siteSlug)
    ? `/agence/${encodeURIComponent(clean(siteSlug))}/contact`
    : "#contact";
  const related = relatedCommercialPage(page, availablePages);
  const relatedHref = related && clean(siteSlug)
    ? `/agence/${encodeURIComponent(clean(siteSlug))}/${encodeURIComponent(related.href)}`
    : related?.href
      ? `/${related.href}`
      : null;
  return {
    title: `Parlons de votre projet de ${intent.service} à ${city}`,
    text: "Expliquez-nous vos envies, vos dates et votre budget : votre conseiller vous aide à préparer une solution adaptée à votre projet.",
    primaryCta: { label: "Demander un devis", href: contactHref },
    secondaryCta: related && relatedHref
      ? { label: `Découvrir nos ${related.title.toLowerCase()}`, href: relatedHref }
      : null,
    style: "primary",
  };
}

function buildCommercialFaq({ agency, page }) {
  const { city, name } = agencyLabel(agency);
  const intent = pageIntent(page);
  if (!city || !isCommercialIntent(intent)) return [];

  const first = {
    cruise: {
      question: `Comment choisir une croisière depuis ${city} ?`,
      answer: `L’équipe ${name} vous aide à comparer les compagnies, les itinéraires, les ports de départ, la durée et le niveau de prestations selon votre budget et vos envies.`,
    },
    circuit: {
      question: `Comment choisir un circuit au départ de ${city} ?`,
      answer: `Votre conseiller à ${city} compare le rythme du circuit, les étapes, les transports, les hébergements et les excursions incluses afin de retenir une formule cohérente avec votre façon de voyager.`,
    },
    custom: {
      question: `Comment créer un voyage sur mesure à ${city} ?`,
      answer: `Nous partons de vos dates, de votre budget et de vos priorités pour assembler les transports, hébergements et expériences qui correspondent réellement à votre projet.`,
    },
    stay: {
      question: `Comment choisir un séjour avec votre agence à ${city} ?`,
      answer: `Nous comparons avec vous la destination, la situation de l’hôtel, la formule de pension, les services et les conditions de voyage avant de vous proposer les solutions les plus adaptées.`,
    },
    ticketing: {
      question: `Votre agence à ${city} peut-elle comparer plusieurs vols ?`,
      answer: `Oui. Nous pouvons étudier différents itinéraires, horaires et conditions tarifaires afin de vous aider à choisir une solution aérienne adaptée à votre voyage.`,
    },
  }[intent.key];

  return [
    first,
    {
      question: `Pourquoi réserver vos ${intent.service} avec une agence à ${city} ?`,
      answer: `Vous bénéficiez d’un interlocuteur identifié qui connaît votre dossier, vous explique les principales conditions de l’offre et reste disponible pour le suivi de votre réservation.`,
    },
    {
      question: `Que faut-il préparer avant de demander un devis à ${name} ?`,
      answer: `Vos dates ou votre période de départ, le nombre de voyageurs, votre budget indicatif et vos principales envies nous permettent de cibler plus rapidement les solutions pertinentes.`,
    },
  ];
}

function hasEditorialCopy(content = {}) {
  return Boolean(
    clean(content.text) ||
    clean(content.description) ||
    clean(content.html) ||
    clean(content.introduction) ||
    (Array.isArray(content.paragraphs) && content.paragraphs.some((value) => clean(value)))
  );
}

function nextBlockPosition(blocks = []) {
  return (blocks || []).reduce((max, block, index) => {
    const numeric = Number(block.position ?? block.displayOrder ?? index);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, -1) + 1;
}

function addGeneratedBlock(nextBlocks, block, changes) {
  nextBlocks.push(block);
  changes.push({
    blockId: null,
    blockType: blockType(block),
    field: "block",
    previous: null,
    next: block.content,
    generated: true,
  });
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
      if (["rich-text", "richtext"].includes(blockType(block))) {
        block.content.html = `<p>${escapeHtml(nextText)}</p>`;
        changes.push({ blockId: block.id || null, blockType: blockType(block), field: "html", previous: "", next: block.content.html });
      } else {
        block.content.text = nextText;
        changes.push({ blockId: block.id || null, blockType: blockType(block), field: "text", previous: "", next: nextText });
      }
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

function ensureCommercialPageStructure(nextBlocks, { agency, page, siteSlug, availablePages, changes }) {
  const intent = pageIntent(page);
  const { city } = agencyLabel(agency);
  if (!city || !isCommercialIntent(intent)) return;

  const hasEditorial = nextBlocks.some((block) =>
    ["rich-text", "richtext", "image-text", "agency"].includes(blockType(block)) && hasEditorialCopy(block.content)
  );
  const hasProofs = nextBlocks.some((block) => ["features", "services", "cards"].includes(blockType(block)));
  const hasFaq = nextBlocks.some((block) => blockType(block) === "faq");
  const hasCta = nextBlocks.some((block) => blockType(block).includes("cta"));
  const generatedStatus = page.published === true || normalize(page.status) === "published" ? "published" : "draft";

  let position = nextBlockPosition(nextBlocks);

  if (!hasEditorial) {
    const title = buildLocalSectionTitle({ agency, page });
    const text = buildLocalSectionText({ agency, page });
    addGeneratedBlock(nextBlocks, {
      type: "rich_text",
      status: generatedStatus,
      position: position++,
      settings: {},
      seo: { generatedBy: "mse-25.30", purpose: "local-commercial-depth" },
      content: {
        title,
        html: `<p>${escapeHtml(text)}</p>`,
        alignment: "left",
      },
    }, changes);
  }

  if (!hasProofs) {
    addGeneratedBlock(nextBlocks, {
      type: "features",
      status: generatedStatus,
      position: position++,
      settings: {},
      seo: { generatedBy: "mse-25.30", purpose: "commercial-proof" },
      content: {
        title: `Pourquoi préparer vos ${intent.service} avec notre agence à ${city} ?`,
        introduction: "Notre équipe vous accompagne pour comparer les options et préparer votre projet avec un interlocuteur de proximité.",
        items: buildCommercialProofs({ agency, page }),
        columns: 3,
      },
    }, changes);
  }

  if (!hasFaq) {
    addGeneratedBlock(nextBlocks, {
      type: "faq",
      status: generatedStatus,
      position: position++,
      settings: {},
      seo: { generatedBy: "mse-25.30", purpose: "local-commercial-faq" },
      content: {
        title: `Questions fréquentes sur les ${intent.service} à ${city}`,
        items: buildCommercialFaq({ agency, page }),
      },
    }, changes);
  }

  if (!hasCta) {
    addGeneratedBlock(nextBlocks, {
      type: "cta",
      status: generatedStatus,
      position: position++,
      settings: {},
      seo: { generatedBy: "mse-25.30", purpose: "commercial-conversion" },
      content: buildCommercialCta({ agency, page, siteSlug, availablePages }),
    }, changes);
  }
}

function optimizePageContent({ agency = {}, page = {}, blocks = [], availablePages = [], siteSlug = "" } = {}) {
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
  ensureCommercialPageStructure(nextBlocks, { agency, page, siteSlug, availablePages, changes });

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
  buildCommercialProofs,
  buildCommercialFaq,
  buildCommercialCta,
  commercialPages,
  relatedCommercialPage,
  isCommercialIntent,
  optimizePageContent,
  pageIntent,
  stableVariant,
};
