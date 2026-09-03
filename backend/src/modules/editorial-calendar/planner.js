const FORMAT_ROTATION = [
  { type: "inspiration", objective: "awareness" },
  { type: "expert_advice", objective: "engagement" },
  { type: "destination_focus", objective: "traffic" },
  { type: "offer", objective: "conversion" },
  { type: "social_proof", objective: "trust" }
];

const SEASONAL_ANGLES = {
  1: "Réserver tôt et préparer les départs de printemps",
  2: "Escapades romantiques et vacances d'hiver",
  3: "Idées de printemps et ponts à venir",
  4: "Ponts de mai et premiers soleils",
  5: "Préparer les vacances d'été",
  6: "Dernières disponibilités estivales",
  7: "Évasion estivale et départs de dernière minute",
  8: "Arrière-saison et voyages d'automne",
  9: "Automne, city-breaks et réservations hiver",
  10: "Soleil d'hiver et fêtes de fin d'année",
  11: "Bons plans, cadeaux et réservations anticipées",
  12: "Fêtes, réveillons et projets de voyage pour l'année suivante"
};

function toUtcDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} invalide`);
    error.status = 400;
    throw error;
  }
  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeDestination(destination, index) {
  if (typeof destination === "string") {
    return { name: destination.trim(), slug: destination.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
  }
  return {
    name: String(destination?.name || destination?.title || `Destination ${index + 1}`).trim(),
    slug: String(destination?.slug || destination?.name || `destination-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    url: destination?.url || null,
    excerpt: destination?.excerpt || null,
    highlights: Array.isArray(destination?.highlights) ? destination.highlights : []
  };
}

function buildSlots({ startDate, endDate, postsPerWeek = 3, destinations = [], agency = {}, channels = [] }) {
  const start = toUtcDate(startDate, "startDate");
  const end = toUtcDate(endDate, "endDate");
  if (end < start) {
    const error = new Error("endDate doit être postérieure ou égale à startDate");
    error.status = 400;
    throw error;
  }
  const cadence = Math.max(1, Math.min(Number(postsPerWeek) || 3, 7));
  const normalizedDestinations = destinations.map(normalizeDestination).filter((item) => item.name);
  if (!normalizedDestinations.length) {
    const error = new Error("Au moins une destination est requise");
    error.status = 400;
    throw error;
  }

  const intervalDays = 7 / cadence;
  const slots = [];
  let cursor = new Date(start);
  let index = 0;

  while (cursor <= end) {
    const destination = normalizedDestinations[index % normalizedDestinations.length];
    const format = FORMAT_ROTATION[index % FORMAT_ROTATION.length];
    const angle = SEASONAL_ANGLES[cursor.getUTCMonth() + 1];
    const title = `${destination.name} — ${angle}`;
    slots.push({
      sequence: index + 1,
      scheduledAt: cursor.toISOString(),
      destination,
      format: format.type,
      objective: format.objective,
      channels,
      source: {
        title,
        destination: destination.name,
        excerpt: destination.excerpt || `${angle}. Découvrez les conseils de ${agency.name || "votre agence de voyages"}.`,
        highlights: destination.highlights,
        agencyName: agency.name || null,
        agencyCity: agency.city || null,
        url: destination.url || null,
        editorialAngle: angle,
        contentType: format.type
      }
    });
    index += 1;
    cursor = addDays(start, Math.round(index * intervalDays));
  }
  return slots;
}

module.exports = { buildSlots, SEASONAL_ANGLES, FORMAT_ROTATION };
