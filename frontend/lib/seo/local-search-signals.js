import { localSearchIntent } from "./local-search-intent";
import { resolvedTargetCities } from "./local-area-config";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = clean(value).toLocaleLowerCase("fr-FR");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function buildLocalSearchSignals(site, pageSlug) {
  const { intent, city, terms, queries } = localSearchIntent(site, pageSlug);
  const serviceAreas = resolvedTargetCities(site, { limit: 4 });
  const agency = site?.agency || {};

  return {
    intent,
    primaryCity: city || null,
    serviceAreas: unique(serviceAreas),
    searchTerms: unique(terms),
    targetQueries: unique(queries),
    nap: {
      name: clean(site?.name || agency?.name) || null,
      address: clean(agency?.address || site?.address) || null,
      postalCode: clean(agency?.postalCode || site?.postalCode) || null,
      city: clean(agency?.city || site?.city) || null,
      phone: clean(agency?.phone || site?.phone) || null,
    },
  };
}

export function hasCompleteLocalNap(site) {
  const { nap } = buildLocalSearchSignals(site);
  return Boolean(nap.name && nap.address && nap.postalCode && nap.city && nap.phone);
}
