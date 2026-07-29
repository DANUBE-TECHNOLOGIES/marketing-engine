"use strict";

function unique(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
}

function destinationAnchors(destination) {
  const name = destination.name;
  const country = destination.country;
  const type = String(destination.type || "destination").toLowerCase();
  const generic = [
    name,
    `voyage à ${name}`,
    `séjour à ${name}`,
    `découvrir ${name}`,
    `partir à ${name}`
  ];
  if (type.includes("city") || type.includes("ville")) generic.push(`week-end à ${name}`, `escapade à ${name}`);
  if (country) generic.push(`voyage en ${country}`, `${name}, ${country}`);
  return unique(generic);
}

function selectAnchor(destination, context = {}) {
  const anchors = destinationAnchors(destination);
  const seed = `${context.sourceId || ""}:${destination.id || destination.slug || destination.name}`;
  let hash = 0;
  for (const char of seed) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return anchors[Math.abs(hash) % anchors.length] || destination.name;
}

module.exports = { destinationAnchors, selectAnchor };
