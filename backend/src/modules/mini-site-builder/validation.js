"use strict";

const BLOCK_TYPES = new Set([
  "hero", "rich-text", "cta", "faq", "reviews", "destinations",
  "gallery", "map", "form", "promotions", "video", "partners",
]);
const STATUSES = new Set(["draft", "published", "archived"]);

function fail(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "PAGE_BLOCK_VALIDATION_ERROR";
  if (details) error.details = details;
  throw error;
}
function objectOrEmpty(value, field) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) fail(`${field} doit être un objet JSON.`);
  return value;
}
function validateBlockInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Le bloc doit être un objet JSON.");
  const out = {};
  if (!partial || Object.hasOwn(input, "blockType")) {
    const type = String(input.blockType || "").trim().toLowerCase();
    if (!BLOCK_TYPES.has(type)) fail(`Type de bloc non supporté: ${type || "vide"}.`, { supportedTypes: [...BLOCK_TYPES] });
    out.blockType = type;
  }
  if (!partial || Object.hasOwn(input, "content")) out.content = objectOrEmpty(input.content, "content");
  if (Object.hasOwn(input, "settings")) out.settings = objectOrEmpty(input.settings, "settings");
  if (Object.hasOwn(input, "seo")) out.seo = objectOrEmpty(input.seo, "seo");
  if (Object.hasOwn(input, "name")) out.name = input.name == null ? null : String(input.name).trim().slice(0, 120) || null;
  if (Object.hasOwn(input, "status")) {
    const status = String(input.status).trim().toLowerCase();
    if (!STATUSES.has(status)) fail(`Statut invalide: ${status}.`);
    out.status = status;
  }
  if (Object.hasOwn(input, "displayOrder")) {
    const order = Number(input.displayOrder);
    if (!Number.isInteger(order) || order < 0) fail("displayOrder doit être un entier positif ou nul.");
    out.displayOrder = order;
  }
  for (const field of ["visibleDesktop", "visibleMobile"]) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== "boolean") fail(`${field} doit être un booléen.`);
      out[field] = input[field];
    }
  }
  return out;
}
function validateReorderInput(input) {
  if (!input || !Array.isArray(input.blocks) || input.blocks.length === 0) fail("blocks doit être une liste non vide.");
  const seen = new Set();
  return input.blocks.map((item, index) => {
    const id = String(item?.id || "").trim();
    const displayOrder = Number(item?.displayOrder ?? index);
    if (!id || seen.has(id) || !Number.isInteger(displayOrder) || displayOrder < 0) fail("Ordre des blocs invalide.");
    seen.add(id);
    return { id, displayOrder };
  });
}
module.exports = { BLOCK_TYPES, validateBlockInput, validateReorderInput };
