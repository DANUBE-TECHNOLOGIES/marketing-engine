"use strict";

const ACTIONS = Object.freeze(new Set([
  "page_view",
  "quote_request",
  "contact",
  "phone",
  "email",
  "directions",
  "appointment",
  "payment_options",
  "destination_explore",
  "service_explore",
  "advisor_contact",
  "partner_outbound",
]));

const INTENTS = Object.freeze(new Set([
  "general_travel",
  "flight_ticketing",
  "flexible_payment",
  "destination",
  "service",
  "advisor",
  "local_contact",
  "partners",
]));

function cleanText(value, max = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function normalizePageSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug) ? "home" : slug.slice(0, 80);
}

function normalizePagePath(value, siteSlug) {
  const raw = String(value || "").trim();
  const fallback = `/agence/${encodeURIComponent(siteSlug)}`;
  if (!raw.startsWith("/")) return fallback;
  return raw.split(/[?#]/, 1)[0].slice(0, 320) || fallback;
}

function normalizeReferrerPath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return null;
  return raw.split(/[?#]/, 1)[0].slice(0, 320) || null;
}

function normalizeTarget(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^tel:/i.test(raw)) return "tel";
  if (/^mailto:/i.test(raw)) return "mailto";
  if (raw.startsWith("/")) return raw.split(/[?#]/, 1)[0].slice(0, 320);
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return `external:${url.hostname.toLowerCase().slice(0, 240)}`;
  } catch {
    return null;
  }
}

function normalizeOccurredAt(value, now = new Date()) {
  const parsed = value ? new Date(value) : now;
  if (Number.isNaN(parsed.getTime())) return now;
  const delta = Math.abs(now.getTime() - parsed.getTime());
  return delta <= 1000 * 60 * 60 * 24 ? parsed : now;
}

function validateConversionInput(input = {}, { siteSlug, now = new Date() } = {}) {
  const action = String(input.action || "").trim().toLowerCase();
  const intent = String(input.intent || "").trim().toLowerCase();
  if (!ACTIONS.has(action)) {
    const error = new Error("Action de conversion invalide.");
    error.code = "PUBLIC_CONVERSION_ACTION_INVALID";
    error.statusCode = 400;
    throw error;
  }
  if (!INTENTS.has(intent)) {
    const error = new Error("Intention de conversion invalide.");
    error.code = "PUBLIC_CONVERSION_INTENT_INVALID";
    error.statusCode = 400;
    throw error;
  }
  const placement = cleanText(input.placement, 120);
  if (!placement) {
    const error = new Error("Placement de conversion obligatoire.");
    error.code = "PUBLIC_CONVERSION_PLACEMENT_REQUIRED";
    error.statusCode = 400;
    throw error;
  }
  return {
    pageSlug: normalizePageSlug(input.pageSlug),
    pagePath: normalizePagePath(input.pagePath, siteSlug),
    action,
    intent,
    placement,
    label: cleanText(input.label, 160),
    target: normalizeTarget(input.target),
    referrerPath: normalizeReferrerPath(input.referrerPath),
    occurredAt: normalizeOccurredAt(input.occurredAt, now),
  };
}

module.exports = {
  ACTIONS,
  INTENTS,
  cleanText,
  normalizeOccurredAt,
  normalizePagePath,
  normalizePageSlug,
  normalizeReferrerPath,
  normalizeTarget,
  validateConversionInput,
};
