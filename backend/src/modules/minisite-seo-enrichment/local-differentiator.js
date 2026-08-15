"use strict";

const { pageIntent } = require("./content-optimizer");

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function joinCities(values = []) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function nextPosition(blocks = []) {
  return blocks.reduce((max, block, index) => {
    const value = Number(block.position ?? block.displayOrder ?? index);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1) + 1;
}

function stableVariant(value, count) {
  const source = normalize(value);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
  return count > 0 ? hash % count : 0;
}

function localPageProfile(page = {}) {
  const intent = pageIntent(page);
  if (intent.key !== "generic") return intent;
  const source = normalize(`${page.slug || ""} ${page.title || ""}`);
  if (source.includes("service")) return { key: "services", service: "services voyage" };
  if (source.includes("destination")) return { key: "destinations", service: "projets de destination" };
  if (source.includes("inspiration")) return { key: "inspirations", service: "inspirations voyage" };
  if (source.includes("engagement")) return { key: "engagements", service: "accompagnement voyage" };
  return intent;
}

function pageSupportsLocalArea(page = {}) {
  return [
    "home", "agency", "cruise", "circuit", "custom", "stay", "ticketing",
    "services", "destinations", "inspirations", "engagements",
  ].includes(localPageProfile(page).key);
}

function alreadyCoversArea(blocks = [], targetCities = []) {
  const body = normalize(JSON.stringify(blocks.map((block) => block.content || {})));
  return targetCities.filter((city) => body.includes(normalize(city))).length >= 2;
}

function genericLocalParagraph({ name, city, area, profile, variant }) {
  const variants = {
    home: [
      `${name} reçoit à ${city} et accompagne aussi les voyageurs de ${area}. Cette proximité permet de préparer un projet en échangeant avec une équipe qui connaît le secteur, puis de conserver le même interlocuteur pour la réservation et le suivi du dossier.`,
      `Depuis ${city}, l’équipe ${name} conseille également les voyageurs venant de ${area}. L’objectif est de réunir conseil, comparaison des solutions et suivi du voyage dans une même agence, sans créer de pages artificielles pour chaque commune voisine.`,
      `Notre agence de ${city} rayonne naturellement vers ${area}. Les voyageurs de cette zone peuvent rencontrer l’équipe ${name}, préciser leurs priorités et bénéficier d’un accompagnement local jusqu’au départ puis au retour.`,
    ],
    agency: [
      `L’équipe ${name} accueille les voyageurs de ${city}, mais aussi de ${area}. Cette zone de proximité permet de privilégier un échange direct, de mieux comprendre chaque projet et de suivre les réservations avec un interlocuteur identifié.`,
      `À ${city}, ${name} est également une agence de proximité pour les habitants de ${area}. Notre équipe prend le temps d’étudier les dates, le budget et la manière de voyager avant de proposer les solutions adaptées.`,
      `Les voyageurs de ${area} peuvent s’appuyer sur l’agence ${name} à ${city} pour préparer leur projet. Le conseil reste local tandis que les solutions comparées couvrent un large choix de destinations et de partenaires.`,
      `Depuis ${city}, ${name} accompagne également les habitants de ${area} qui souhaitent préparer leur voyage avec un conseiller disponible. L’échange en agence permet de hiérarchiser les priorités avant de retenir les prestations réellement utiles.`,
      `Pour les voyageurs de ${area}, l’agence ${name} à ${city} constitue un point de contact de proximité pour étudier un projet, comparer les possibilités et suivre les différentes étapes de la réservation sans multiplier les interlocuteurs.`,
      `L’agence ${name} reçoit à ${city} des clients venant aussi de ${area}. Cette implantation locale permet d’organiser un rendez-vous, de reprendre ensemble les détails du projet et de conserver une continuité de suivi jusqu’au départ.`,
      `Les habitants de ${area} peuvent rencontrer l’équipe ${name} à ${city} pour confronter leurs envies aux contraintes réelles du voyage : calendrier, budget, transports, hébergements et niveau d’accompagnement souhaité.`,
      `À partir de son implantation à ${city}, ${name} accompagne également les voyageurs de ${area}. L’équipe privilégie une préparation structurée du dossier, depuis la définition du besoin jusqu’aux dernières informations utiles avant le voyage.`,
      `Pour les clients de ${city} comme de ${area}, ${name} mise sur une relation suivie avec l’agence. Le conseiller peut ainsi connaître le contexte du projet, expliquer les options retenues et rester disponible lorsque le dossier nécessite un ajustement.`,
    ],
    services: [
      `Depuis notre agence de ${city}, nous proposons aux voyageurs de ${area} un accompagnement qui va de la recherche du séjour aux formalités, à la billetterie et au suivi du dossier. Chaque service est mobilisé selon le projet plutôt qu’appliqué comme une formule standard.`,
      `Pour les habitants de ${city} et de ${area}, les services de ${name} s’organisent autour d’un même objectif : simplifier la préparation du voyage tout en conservant un conseiller joignable. Comparaison, réservation et suivi restent réunis dans la même agence.`,
      `Notre équipe de ${city} accompagne aussi les voyageurs de ${area} pour choisir les prestations réellement utiles à leur projet. Selon le dossier, cela peut concerner le transport, l’hébergement, les assurances, les formalités ou la construction d’un itinéraire complet.`
    ],
    destinations: [
      `À ${city}, ${name} aide également les voyageurs de ${area} à transformer une envie de destination en projet concret. Saison, durée, rythme du voyage et budget sont mis en perspective avant de retenir les solutions les plus cohérentes.`,
      `Les voyageurs de ${city} et de ${area} peuvent utiliser notre sélection de destinations comme point de départ, puis échanger avec l’agence pour adapter le projet à leurs dates et à leurs priorités. Le choix ne se limite pas à une liste de lieux : il tient compte de la façon de voyager.`,
      `Depuis ${city}, notre équipe conseille aussi les habitants de ${area} dans le choix d’une destination. Nous comparons les périodes de départ, les expériences recherchées et le niveau de prestations afin d’éviter une recommandation identique pour tous.`
    ],
    inspirations: [
      `Les inspirations proposées par ${name} sont pensées pour nourrir les projets des voyageurs de ${city} et de ${area}. Elles servent de point de départ avant un échange en agence permettant d’adapter l’idée aux dates, au budget et au rythme souhaité.`,
      `Depuis ${city}, notre équipe partage des idées de voyage utiles également aux habitants de ${area}. Une inspiration peut ensuite devenir un séjour, un circuit ou un itinéraire sur mesure construit avec un conseiller selon les contraintes réelles du projet.`,
      `Pour les voyageurs de ${city} et de ${area}, cette page rassemble des pistes à explorer plutôt qu’un catalogue figé. L’équipe ${name} peut ensuite confronter ces idées aux saisons, aux durées disponibles et aux attentes de chaque voyageur.`
    ],
    engagements: [
      `À ${city}, les engagements de ${name} prennent une forme concrète pour les voyageurs du secteur, notamment ceux de ${area} : écoute du projet, explication des solutions proposées et continuité du suivi avant le départ.`,
      `Pour les clients de ${city} comme de ${area}, notre engagement repose d’abord sur la qualité de l’échange et la clarté du suivi. L’équipe reste identifiée tout au long du dossier afin que la relation ne s’arrête pas au moment de la réservation.`,
      `L’ancrage local de ${name} à ${city} nous conduit à accompagner aussi les voyageurs de ${area} avec les mêmes principes : conseil personnalisé, comparaison des options et disponibilité lorsque le dossier nécessite un suivi.`
    ],
  };
  const choices = variants[profile.key] || variants.home;
  return choices[variant % choices.length];
}

function buildLocalAreaContent({ agency = {}, page = {}, targetCities = [] } = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name) || (city ? `Mondescale ${city}` : "Mondescale");
  const nearby = targetCities.slice(0, 3).map(clean).filter(Boolean);
  const profile = localPageProfile(page);
  if (!city || nearby.length < 2 || !pageSupportsLocalArea(page)) return null;

  const area = joinCities(nearby);
  const variant = stableVariant(`${agency.id || ""}|${name}|${city}|${page.slug || page.title || profile.key}`, 9);
  const commercial = ["cruise", "circuit", "custom", "stay", "ticketing"].includes(profile.key);

  if (commercial) {
    const texts = [
      `Pour les voyageurs de ${city}, ${area}, l’équipe ${name} accompagne les projets de ${profile.service} depuis un même point de conseil local. Le conseiller étudie les dates, le budget et les attentes avant de comparer les solutions, puis reste l’interlocuteur du dossier jusqu’au départ.`,
      `Les habitants de ${city} et de ${area} peuvent préparer leurs ${profile.service} avec l’équipe ${name}. Le projet est étudié dans son ensemble afin de comparer les prestations utiles, d’identifier les contraintes et de conserver un suivi de proximité après la réservation.`,
      `Depuis ${city}, ${name} accompagne aussi les voyageurs de ${area} pour leurs projets de ${profile.service}. Notre rôle consiste à confronter les envies aux dates, aux conditions de voyage et au budget, puis à assurer la continuité du suivi avec un conseiller identifié.`,
    ];
    return {
      title: `Vos ${profile.service} avec une agence proche de chez vous`,
      html: `<p>${escapeHtml(texts[variant % texts.length])}</p>`,
      alignment: "left",
    };
  }

  const titles = {
    home: `Une agence de proximité pour ${city} et ses environs`,
    agency: `Votre agence à ${city}, proche des voyageurs du secteur`,
    services: `Des services voyage accessibles depuis ${city} et ses environs`,
    destinations: `Des destinations conseillées depuis votre agence de ${city}`,
    inspirations: `Des idées de voyage à explorer avec votre agence de ${city}`,
    engagements: `Nos engagements auprès des voyageurs de ${city} et des environs`,
  };

  return {
    title: titles[profile.key] || `Votre agence de proximité à ${city}`,
    html: `<p>${escapeHtml(genericLocalParagraph({ name, city, area, profile, variant }))}</p>`,
    alignment: "left",
  };
}

function applyLocalAreaDifferentiation({ blocks = [], changes = [], agency = {}, page = {}, targetCities = [] } = {}) {
  const nextBlocks = blocks.map((block) => ({ ...block, content: { ...(block.content || {}) } }));
  const nextChanges = changes.slice();
  const cities = targetCities.map(clean).filter(Boolean);
  const content = buildLocalAreaContent({ agency, page, targetCities: cities });

  if (!content || alreadyCoversArea(nextBlocks, cities)) {
    return { blocks: nextBlocks, changes: nextChanges, changed: nextChanges.length > 0 };
  }

  const generatedStatus = page.published === true || normalize(page.status) === "published" ? "published" : "draft";
  const block = {
    type: "rich_text",
    status: generatedStatus,
    position: nextPosition(nextBlocks),
    settings: {},
    seo: { generatedBy: "mse-25.30", purpose: "local-area-differentiation" },
    content,
  };
  nextBlocks.push(block);
  nextChanges.push({
    blockId: null,
    blockType: "rich-text",
    field: "block",
    previous: null,
    next: content,
    generated: true,
    purpose: "local-area-differentiation",
  });

  return { blocks: nextBlocks, changes: nextChanges, changed: true };
}

module.exports = {
  alreadyCoversArea,
  applyLocalAreaDifferentiation,
  buildLocalAreaContent,
  genericLocalParagraph,
  joinCities,
  localPageProfile,
  pageSupportsLocalArea,
  stableVariant,
};
