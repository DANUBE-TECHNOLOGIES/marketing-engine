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
    `Depuis ${city}, retrouvez chez ${agencyName} les informations publiées pour préparer un projet vers ${destination} et échanger avec un conseiller de proximité.`,
  ({ agencyName, city, destination }) =>
    `Vous préparez un voyage à ${destination} depuis ${city} ? ${agencyName} rassemble sur cette page les informations publiées sur cette destination et vous permet de poursuivre votre projet avec l’agence.`,
  ({ agencyName, city, destination }) =>
    `À ${city}, ${agencyName} présente ${destination} parmi les destinations publiées sur son mini-site afin de vous aider à préparer votre projet de voyage.`,
  ({ agencyName, city, destination }) =>
    `Cette page de ${agencyName} à ${city} rassemble les informations publiées pour découvrir ${destination} et préparer la suite de votre projet avec l’agence.`,
  ({ agencyName, city, destination }) =>
    `${agencyName} met à disposition des voyageurs de ${city} cette page consacrée à ${destination}, avec les informations publiées pour préparer leur projet.`,
]);

const AREA_SENTENCES = Object.freeze([
  ({ nearby, destination }) =>
    `Cette page consacrée à ${destination} est également accessible aux voyageurs de ${joinedCities(nearby)} qui souhaitent contacter l’agence.`,
  ({ nearby, destination }) =>
    `Les voyageurs de ${joinedCities(nearby)} peuvent eux aussi consulter ces informations sur ${destination} et prendre contact avec l’agence.`,
  ({ nearby, destination }) =>
    `Depuis ${joinedCities(nearby)} et les communes voisines, vous pouvez consulter cette page sur ${destination} puis contacter l’agence pour votre projet.`,
  ({ nearby, destination }) =>
    `Le contenu publié sur ${destination} est également proposé aux voyageurs de ${joinedCities(nearby)} dans la zone de proximité de l’agence.`,
]);

const VALUE_SENTENCES = Object.freeze([
  ({ destination }) =>
    `Les éléments propres à ${destination} présentés ici proviennent du contenu publié de cette page ; l’agence peut ensuite être contactée pour étudier votre demande.`,
  ({ destination }) =>
    `Pour ${destination}, cette page distingue les informations éditoriales publiées de l’étude personnalisée qui peut être réalisée ensuite avec l’agence.`,
  ({ destination }) =>
    `Les informations affichées sur ${destination} servent de point de départ à votre projet ; contactez l’agence pour une recherche adaptée à vos critères.`,
  ({ destination }) =>
    `Cette présentation de ${destination} repose sur les informations publiées du mini-site et peut être complétée par un échange avec l’agence selon votre projet.`,
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
