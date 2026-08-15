"use strict";

const { pageIntent } = require("./content-optimizer");

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function joinCities(values = []) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function nextPosition(blocks = []) {
  return blocks.reduce((max, block, index) => {
    const value = Number(block.position ?? block.displayOrder ?? index);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1) + 1;
}

function pageSupportsLocalArea(page = {}) {
  return ["home", "agency", "cruise", "circuit", "custom", "stay", "ticketing"].includes(pageIntent(page).key);
}

function alreadyCoversArea(blocks = [], targetCities = []) {
  const body = normalize(JSON.stringify(blocks.map((block) => block.content || {})));
  return targetCities.filter((city) => body.includes(normalize(city))).length >= 2;
}

function buildLocalAreaContent({ agency = {}, page = {}, targetCities = [] } = {}) {
  const city = clean(agency.city);
  const name = clean(agency.name) || (city ? `Mondescale ${city}` : "Mondescale");
  const nearby = targetCities.slice(0, 3).map(clean).filter(Boolean);
  const intent = pageIntent(page);
  if (!city || nearby.length < 2 || !pageSupportsLocalArea(page)) return null;

  const area = joinCities(nearby);
  if (intent.key === "home" || intent.key === "agency") {
    return {
      title: `Une agence de proximité pour ${city} et ses environs`,
      html: `<p>${escapeHtml(`${name} accompagne aussi les voyageurs de ${area}. Cette zone de proximité permet à notre équipe de rester un interlocuteur local pour préparer, réserver et suivre les projets de voyage sans multiplier les pages artificielles par commune.`)}</p>`,
      alignment: "left",
    };
  }

  return {
    title: `Vos ${intent.service} avec une agence proche de chez vous`,
    html: `<p>${escapeHtml(`Pour les voyageurs de ${city}, ${area}, l’équipe ${name} accompagne les projets de ${intent.service} depuis un même point de conseil local. Vous bénéficiez ainsi d’un suivi de proximité tout en accédant aux solutions adaptées à votre projet.`)}</p>`,
    alignment: "left",
  };
}

function applyLocalAreaDifferentiation({ blocks = [], changes = [], agency = {}, page = {}, targetCities = [] } = {}) {
  const nextBlocks = blocks.map((block) => ({ ...block, content: { ...(block.content || {}) } }));
  const nextChanges = changes.slice();
  const cities = targetCities.map(clean).filter(Boolean);
  const content = buildLocalAreaContent({ agency, page, targetCities: cities });

  if (!content || alreadyCoversArea(nextBlocks, cities)) {
    return { blocks: nextBlocks, changes: nextChanges, changed: nextChanges.length > 0 };
  }

  const block = {
    type: "rich_text",
    status: "draft",
    position: nextPosition(nextBlocks),
    settings: {},
    seo: { generatedBy: "mse-25.30", purpose: "local-area-differentiation" },
    content,
  };
  nextBlocks.push(block);
  nextChanges.push({
    blockId: null,
    blockType: "rich-text",
    field: "block",
    previous: null,
    next: content,
    generated: true,
    purpose: "local-area-differentiation",
  });

  return { blocks: nextBlocks, changes: nextChanges, changed: true };
}

module.exports = {
  alreadyCoversArea,
  applyLocalAreaDifferentiation,
  buildLocalAreaContent,
  joinCities,
};
