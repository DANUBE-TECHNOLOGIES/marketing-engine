const COMMERCIAL_INTENTS = Object.freeze({
  home: ["agence de voyage", "agence de voyages", "agence voyage"],
  services: ["conseil voyage", "voyage sur mesure", "séjour", "circuit", "croisière"],
  ticketing: ["billet avion", "billetterie", "vol"],
  groups: ["voyage en groupe", "voyage de groupe", "groupe"],
  business: ["voyage d'affaires", "voyage professionnel", "déplacement professionnel"],
  destinations: ["destination voyage", "séjour", "circuit"],
  inspiration: ["idées voyage", "inspiration voyage"],
  contact: ["agence de voyage", "contact agence de voyage"],
});

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLocaleLowerCase("fr-FR");
}

function primaryCity(site) {
  return clean(site?.agency?.city || site?.city);
}

function routeIntent(pageSlug) {
  const slug = normalize(pageSlug);
  if (!slug || ["home", "accueil", "index"].includes(slug)) return "home";
  if (["billetterie", "billets-avion", "vols"].includes(slug)) return "ticketing";
  if (["voyages-en-groupe", "groupes", "voyage-groupe"].includes(slug)) return "groups";
  if (["business-travel", "voyages-affaires", "voyage-affaires"].includes(slug)) return "business";
  if (["services"].includes(slug)) return "services";
  if (["destinations", "destination"].includes(slug)) return "destinations";
  if (["inspiration", "inspirations", "idees-voyage"].includes(slug)) return "inspiration";
  if (["contact", "nous-contacter"].includes(slug)) return "contact";
  return "home";
}

export function localSearchIntent(site, pageSlug) {
  const city = primaryCity(site);
  const intent = routeIntent(pageSlug);
  const terms = COMMERCIAL_INTENTS[intent] || COMMERCIAL_INTENTS.home;
  const queries = city ? terms.map((term) => `${term} ${city}`) : [...terms];
  return { intent, city, terms: [...terms], queries };
}

export function localSearchTerms(site, pageSlug, { limit = 6 } = {}) {
  return localSearchIntent(site, pageSlug).queries.slice(0, Math.max(0, limit));
}

export { COMMERCIAL_INTENTS, primaryCity, routeIntent };
