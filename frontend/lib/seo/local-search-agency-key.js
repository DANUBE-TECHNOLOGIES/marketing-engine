function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function localSearchAgencyKey(site) {
  const agency = site?.agency || {};
  return normalize(
    agency.slug ||
    site?.slug ||
    agency.city ||
    site?.city ||
    agency.name ||
    site?.name
  );
}

export function localSearchMetricKey(site, query) {
  const agencyKey = localSearchAgencyKey(site);
  const queryKey = normalize(query);
  return agencyKey && queryKey ? `${agencyKey}:${queryKey}` : null;
}
