"use strict";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const LOCAL_AREA_BY_SITE_SLUG = Object.freeze({
  "ambassade-fram-mondescale-bois-colombes": [
    "Colombes",
    "Asnières-sur-Seine",
    "La Garenne-Colombes",
    "Courbevoie",
    "Gennevilliers",
  ],
  "ambassade-fram-mondescale-dax": [
    "Saint-Paul-lès-Dax",
    "Narrosse",
    "Yzosse",
    "Tercis-les-Bains",
    "Seyresse",
  ],
  "ambassade-fram-mondescale-gien": [
    "Poilly-lez-Gien",
    "Briare",
    "Châtillon-sur-Loire",
    "Saint-Brisson-sur-Loire",
    "Sully-sur-Loire",
  ],
  "ambassade-fram-mondescale-maurepas": [
    "Élancourt",
    "Coignières",
    "La Verrière",
    "Le Mesnil-Saint-Denis",
    "Trappes",
  ],
  "ambassade-fram-mondescale-nevers": [
    "Varennes-Vauzelles",
    "Coulanges-lès-Nevers",
    "Marzy",
    "Fourchambault",
    "Challuy",
  ],
  "ambassade-fram-mondescale-ozoir-la-ferriere": [
    "Pontault-Combault",
    "Roissy-en-Brie",
    "Gretz-Armainvilliers",
    "Tournan-en-Brie",
    "Lésigny",
  ],
  "mondescale-lamorlaye": [
    "Chantilly",
    "Gouvieux",
    "Coye-la-Forêt",
    "Chaumontel",
    "Orry-la-Ville",
  ],
});

function explicitTargetCities(site = {}) {
  const agency = site.agency || {};
  const values = site.targetCities || site.metadata?.targetCities || agency.targetCities || [];
  return Array.isArray(values) ? values : [];
}

function configuredTargetCities(site = {}) {
  return LOCAL_AREA_BY_SITE_SLUG[clean(site.slug).toLowerCase()] || [];
}

function resolvedTargetCities(site = {}, { limit = 5 } = {}) {
  const primary = clean(site.agency?.city || site.city).toLocaleLowerCase("fr-FR");
  const source = explicitTargetCities(site).length ? explicitTargetCities(site) : configuredTargetCities(site);
  const seen = new Set();
  const result = [];

  for (const value of source) {
    const city = clean(typeof value === "string" ? value : value?.name || value?.city);
    if (!city) continue;
    const key = city.toLocaleLowerCase("fr-FR");
    if (key === primary || seen.has(key)) continue;
    seen.add(key);
    result.push(city);
  }

  return result.slice(0, limit);
}

module.exports = {
  LOCAL_AREA_BY_SITE_SLUG,
  configuredTargetCities,
  explicitTargetCities,
  resolvedTargetCities,
};
