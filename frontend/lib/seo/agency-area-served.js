import { resolvedTargetCities } from "./local-area-config";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const result = [];
  const seen = new Set();

  for (const value of values || []) {
    const name = clean(
      typeof value === "string"
        ? value
        : value?.name || value?.city
    );
    if (!name) continue;

    const key = name.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

export function agencyAreaServedNames(site, { targetLimit = 6 } = {}) {
  const agency = site?.agency || site || {};
  const primaryCity = clean(agency?.city || site?.city);
  const targetCities = resolvedTargetCities(site, { limit: targetLimit });

  return unique([primaryCity, ...targetCities]);
}

export function cityAreaServedSchema(names) {
  return unique(names).map((name) => ({
    "@type": "City",
    name,
  }));
}

export { clean as cleanAgencyAreaServedValue, unique as uniqueAgencyAreaServedNames };
