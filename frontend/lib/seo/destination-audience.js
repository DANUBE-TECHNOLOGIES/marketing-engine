export function destinationAudiences(destination) {
  const values = Array.isArray(destination?.audiences)
    ? destination.audiences
    : [];
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const audience = String(value || "").replace(/\s+/g, " ").trim();
    if (!audience) continue;

    const key = audience.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(audience);
  }

  return result.slice(0, 12);
}
