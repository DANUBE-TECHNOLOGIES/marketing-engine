function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(values, seed, offset = 0) {
  if (!Array.isArray(values) || !values.length) return "";
  return values[(seed + offset) % values.length];
}

function joinedCities(values) {
  const cities = (Array.isArray(values) ? values : []).filter(Boolean);
  if (!cities.length) return "";
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} et ${cities[1]}`;
  return `${cities.slice(0, -1).join(", ")} et ${cities[cities.length - 1]}`;
}

const OPENINGS = Object.freeze([
  ({ agencyName, city, destination }) =>
    `Depuis ${city}, l’équipe de ${agencyName} vous aide à transformer votre envie de ${destination} en voyage concret, avec un itinéraire, un rythme et des prestations adaptés à votre projet.`,
  ({ agencyName, city, destination }) =>
    `Préparer ${destination} depuis ${city}, c’est pouvoir échanger avec ${agencyName} sur les étapes du voyage, les bonnes périodes et les choix qui comptent vraiment pour votre séjour.`,
  ({ agencyName, city, destination }) =>
    `À ${city}, ${agencyName} construit votre voyage à ${destination} autour de vos priorités : découverte, confort, budget, rythme et accompagnement avant le départ.`,
  ({ agencyName, city, destination }) =>
    `Votre projet ${destination} peut être préparé directement avec ${agencyName} à ${city}, pour comparer les solutions et composer un séjour cohérent plutôt qu’une simple juxtaposition de prestations.`,
  ({ agencyName, city, destination }) =>
    `${agencyName} accompagne les voyageurs de ${city} qui souhaitent découvrir ${destination} avec un conseil de proximité et un projet adapté à leurs dates, leurs envies et leur budget.`,
]);

const AREA_SENTENCES = Object.freeze([
  ({ nearby, destination }) =>
    `L’agence accompagne aussi les voyageurs de ${joinedCities(nearby)} pour leurs projets vers ${destination}.`,
  ({ nearby, destination }) =>
    `Pour ${destination}, nos conseillers reçoivent également des voyageurs venant de ${joinedCities(nearby)} et des communes voisines.`,
  ({ nearby, destination }) =>
    `Cette expertise est accessible aux voyageurs de ${joinedCities(nearby)} qui souhaitent préparer ${destination} avec un interlocuteur local.`,
  ({ nearby, destination }) =>
    `Les projets vers ${destination} sont également préparés pour les clients de ${joinedCities(nearby)}, au sein de la même zone de proximité.`,
]);

const VALUE_SENTENCES = Object.freeze([
  ({ destination }) =>
    `Nous pouvons comparer différentes formules pour ${destination}, ajuster les étapes et vérifier la cohérence globale du voyage avant réservation.`,
  ({ destination }) =>
    `Pour ${destination}, l’accompagnement porte autant sur le choix du séjour que sur les détails pratiques : transport, durée, rythme, hébergements et options utiles.`,
  ({ destination }) =>
    `L’objectif est de construire un voyage à ${destination} qui corresponde réellement à votre façon de voyager, plutôt que de vous proposer une solution standard par défaut.`,
  ({ destination }) =>
    `Nos conseillers peuvent mettre en perspective plusieurs possibilités pour ${destination} et vous aider à arbitrer entre budget, confort, emplacement et expériences.` ,
]);

export function destinationLocalCopy({ site, destination, nearby = [] }) {
  const agencyName = String(site?.name || site?.agency?.name || "votre agence").trim();
  const city = String(site?.agency?.city || site?.city || "").trim();
  const destinationName = String(destination?.name || "votre destination").trim();
  const seed = hashString(`${site?.slug || agencyName}:${destination?.slug || destinationName}`);
  const context = {
    agencyName,
    city,
    destination: destinationName,
    nearby,
  };

  return {
    seed,
    opening: city ? pick(OPENINGS, seed, 0)(context) : "",
    area: nearby.length ? pick(AREA_SENTENCES, seed, 1)(context) : "",
    value: pick(VALUE_SENTENCES, seed, 2)(context),
  };
}

export function rotateCommercialLinks(links, site, destination) {
  const items = Array.isArray(links) ? [...links] : [];
  if (items.length < 2) return items;
  const seed = hashString(`${site?.slug || ""}:${destination?.slug || destination?.name || ""}:links`);
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export { hashString, joinedCities };
