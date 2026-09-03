function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function classifyLocalSearchQuery(query) {
  const value = normalize(query);
  if (!value) return "unknown";
  if (/\bfram\b|\bmondescale\b/.test(value)) return "brand";
  if (/\bbillet|\bbilletterie|\bvols?\b/.test(value)) return "ticketing";
  if (/\bgroupe?s?\b/.test(value)) return "groups";
  if (/\baffaires?\b|\bprofessionnel/.test(value)) return "business";
  if (/\bcroisiere|\bcircuit|\bsejour|\bsur mesure/.test(value)) return "service";
  if (/\bagence\b.*\bvoyage/.test(value)) return "agency-local";
  return "other";
}

export function enrichSearchConsoleRows(rows = []) {
  return rows.map((row) => ({ ...row, intent: classifyLocalSearchQuery(row?.query) }));
}
