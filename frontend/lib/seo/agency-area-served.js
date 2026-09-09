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

export function agencyAreaServedNames(site, { limit = 6 } = {}) {
  const agency = site?.agency || site || {};
  const primaryCity = clean(agency?.city || site?.city);
  const targetCities = Array.isArray(site?.resolvedTargetCities)
    ? site.resolvedTargetCities
    : [];

  return unique([primaryCity, ...targetCities]).slice(0, limit + 1);
}

export function cityAreaServedSchema(names) {
  return unique(names).map((name) => ({
    "@type": "City",
    name,
  }));
}

export { clean as cleanAgencyAreaServedValue, unique as uniqueAgencyAreaServedNames };
