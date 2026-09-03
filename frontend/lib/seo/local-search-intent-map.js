import { localSearchIntent } from "./local-search-intent";

const MANAGED_ROUTES = Object.freeze([
  "",
  "services",
  "billetterie",
  "voyages-en-groupe",
  "business-travel",
  "destinations",
  "inspirations",
  "contact",
]);

export function buildLocalIntentMap(site) {
  return MANAGED_ROUTES.map((route) => {
    const signal = localSearchIntent(site, route);
    return {
      route: route || "home",
      intent: signal.intent,
      city: signal.city || null,
      primaryQuery: signal.queries[0] || null,
      supportingQueries: signal.queries.slice(1),
    };
  });
}

export function duplicatePrimaryQueries(site) {
  const seen = new Map();
  const duplicates = [];
  for (const entry of buildLocalIntentMap(site)) {
    if (!entry.primaryQuery) continue;
    const key = entry.primaryQuery.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) {
      duplicates.push({ query: entry.primaryQuery, routes: [seen.get(key), entry.route] });
    } else {
      seen.set(key, entry.route);
    }
  }
  return duplicates;
}

export { MANAGED_ROUTES };
