"use strict";

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function seasonalBoost(destination, month) {
  const text = normalize(`${destination.name} ${destination.bestTime || ""} ${(destination.audiences || []).join(" ")}`);
  const winter = [11, 0, 1, 2].includes(month);
  const summer = [5, 6, 7, 8].includes(month);
  if (winter && /(laponie|ski|neige|aurore|canaries|caraibes|egypte)/.test(text)) return 20;
  if (summer && /(crete|grece|espagne|italie|croatie|bal[eé]ares|mediterranee)/.test(text)) return 20;
  return 0;
}

function findDestinationOpportunities({ site, destinations = [], campaigns = [], now = new Date(), limit = 10 }) {
  const covered = new Set((site.pages || []).map((p) => normalize(p.slug)));
  const promoted = new Set(campaigns.map((c) => normalize(c.destinationSlug)));
  return destinations
    .filter((d) => d.status === "published" || d.status === "active")
    .filter((d) => !covered.has(normalize(d.slug)))
    .map((destination) => {
      let score = 50;
      score += seasonalBoost(destination, now.getMonth());
      if (!promoted.has(normalize(destination.slug))) score += 10;
      if (destination.summary) score += 5;
      if ((destination.highlights || []).length >= 3) score += 5;
      return {
        type: "destination_gap",
        destinationId: destination.id,
        destinationSlug: destination.slug,
        title: `Créer une page destination « ${destination.name} »`,
        rationale: "Destination publiée dans le référentiel mais absente du mini-site.",
        score: Math.min(100, score),
        autoExecutable: true
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { normalize, seasonalBoost, findDestinationOpportunities };
