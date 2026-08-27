"use strict";

const ALLOWED_PRODUCTS = new Set(["flight", "travel"]);
const ALLOWED_FEE_MODES = new Set(["unspecified", "with-fees", "without-fees"]);
const FLIGHT_PAGE_SLUGS = new Set(["billetterie", "billetterie-vols", "billetterie-et-vols", "vols", "flight", "flights"]);

function normalizeText(value) { return typeof value === "string" ? value.trim() : ""; }

function normalizePaymentPolicy(input = {}) {
  const enabled = input.enabled === true;
  const products = [...new Set(Array.isArray(input.products) ? input.products : [])]
    .map((value) => normalizeText(value).toLowerCase()).filter((value) => ALLOWED_PRODUCTS.has(value));
  const installmentCounts = [...new Set(Array.isArray(input.installmentCounts) ? input.installmentCounts : [])]
    .map(Number).filter((value) => Number.isInteger(value) && value >= 2 && value <= 24).sort((a, b) => a - b);
  const requestedFeeMode = normalizeText(input.feeMode).toLowerCase();
  return {
    enabled,
    products,
    installmentCounts,
    feeMode: ALLOWED_FEE_MODES.has(requestedFeeMode) ? requestedFeeMode : "unspecified",
    ctaMode: "contact",
    disclaimer: normalizeText(input.disclaimer),
    ctaLabel: normalizeText(input.ctaLabel) || "Contacter mon agence",
  };
}

function validatePaymentPolicyInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    const error = new Error("La configuration de paiement doit être un objet."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID"; error.status = 400; throw error;
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    const error = new Error("enabled doit être un booléen."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_ENABLED"; error.status = 400; throw error;
  }
  if (input.products !== undefined) {
    if (!Array.isArray(input.products)) { const error = new Error("products doit être un tableau."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_PRODUCTS"; error.status = 400; throw error; }
    const invalid = input.products.map((v) => normalizeText(v).toLowerCase()).find((v) => !ALLOWED_PRODUCTS.has(v));
    if (invalid) { const error = new Error(`Produit de paiement non supporté : ${invalid}.`); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_PRODUCT"; error.status = 400; throw error; }
  }
  if (input.installmentCounts !== undefined) {
    if (!Array.isArray(input.installmentCounts)) { const error = new Error("installmentCounts doit être un tableau."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_INSTALLMENTS"; error.status = 400; throw error; }
    if (input.installmentCounts.some((v) => !Number.isInteger(Number(v)) || Number(v) < 2 || Number(v) > 24)) { const error = new Error("Les échéances doivent être des entiers compris entre 2 et 24."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_INSTALLMENT"; error.status = 400; throw error; }
  }
  if (input.feeMode !== undefined && !ALLOWED_FEE_MODES.has(normalizeText(input.feeMode).toLowerCase())) {
    const error = new Error("feeMode doit être unspecified, with-fees ou without-fees."); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_FEE_MODE"; error.status = 400; throw error;
  }
  for (const field of ["disclaimer", "ctaLabel"]) if (input[field] !== undefined && typeof input[field] !== "string") {
    const error = new Error(`${field} doit être une chaîne de caractères.`); error.code = "FLEXIBLE_PAYMENT_POLICY_INVALID_TEXT"; error.status = 400; throw error;
  }
  const normalized = normalizePaymentPolicy(input);
  if (normalized.enabled && normalized.products.length === 0) { const error = new Error("Une configuration activée doit cibler au moins un produit."); error.code = "FLEXIBLE_PAYMENT_POLICY_PRODUCTS_REQUIRED"; error.status = 400; throw error; }
  return normalized;
}

function formatInstallmentClaim(policy) {
  if (!policy.installmentCounts.length) return "";
  const labels = policy.installmentCounts.map((count) => `${count}x`);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} ou ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} ou ${labels.at(-1)}`;
}

function buildPublicPaymentCopy(input = {}) {
  const policy = normalizePaymentPolicy(input);
  if (!policy.enabled || policy.products.length === 0) return null;
  const includesFlight = policy.products.includes("flight");
  const includesTravel = policy.products.includes("travel");
  const installmentClaim = formatInstallmentClaim(policy);
  const feeClaim = policy.feeMode === "without-fees" ? " sans frais" : "";
  const title = includesFlight && includesTravel ? "Payez vos billets d’avion et vos voyages en plusieurs fois" : includesFlight ? "Payez vos billets d’avion en plusieurs fois" : "Payez votre voyage en plusieurs fois";
  let body;
  if (installmentClaim) body = `Selon votre réservation et les conditions applicables, votre agence peut vous proposer un règlement en ${installmentClaim}${feeClaim}.`;
  else if (includesFlight && includesTravel) body = "Pour vos billets d’avion comme pour vos voyages, votre agence peut étudier avec vous une solution de règlement échelonné adaptée à votre réservation.";
  else if (includesFlight) body = "Pour votre billetterie aérienne, votre agence peut étudier avec vous une solution de règlement échelonné adaptée à votre réservation.";
  else body = "Pour votre voyage, votre agence peut étudier avec vous une solution de règlement échelonné adaptée à votre réservation.";
  return {
    eyebrow: "Facilités de paiement", title, body,
    disclaimer: policy.disclaimer || "Sous réserve des conditions applicables à votre réservation. Renseignez-vous auprès de votre agence.",
    ctaLabel: policy.ctaLabel === "Contacter mon agence" ? "Étudier mes possibilités de paiement" : policy.ctaLabel,
    products: policy.products, installmentCounts: policy.installmentCounts, feeMode: policy.feeMode,
  };
}

function isPublishedPage(page) { return page && (page.published === true || page.status === "published"); }
function hasFlexiblePaymentBlock(page) { return Array.isArray(page?.blocks) && page.blocks.some((block) => ["flexible_payment", "flexible-payment"].includes(normalizeText(block?.blockType || block?.type).toLowerCase())); }
function classifyPlacement(page = {}) {
  const slug = normalizeText(page.slug).toLowerCase();
  if (slug === "home" || slug === "accueil") return "compact";
  if (FLIGHT_PAGE_SLUGS.has(slug) || slug.includes("billetterie") || slug.includes("vol")) return "enriched";
  return null;
}

function planPaymentPlacements({ site = {}, policy: inputPolicy = {} } = {}) {
  const policy = normalizePaymentPolicy(inputPolicy);
  const copy = buildPublicPaymentCopy(policy);
  if (!copy) return { version: "mse-25.32", enabled: false, proposals: [], skipped: [] };
  const proposals = [], skipped = [];
  for (const page of Array.isArray(site.pages) ? site.pages : []) {
    if (!isPublishedPage(page)) { skipped.push({ slug: page?.slug || null, reason: "page-not-published" }); continue; }
    const placement = classifyPlacement(page); if (!placement) continue;
    if (hasFlexiblePaymentBlock(page)) { skipped.push({ slug: page.slug, reason: "flexible-payment-block-already-present" }); continue; }
    proposals.push({ slug: page.slug, placement, block: { blockType: "flexible_payment", content: {
      variant: placement, eyebrow: copy.eyebrow, title: copy.title, body: copy.body, disclaimer: copy.disclaimer,
      ctaLabel: copy.ctaLabel, primaryCta: { href: "contact", label: copy.ctaLabel }, products: copy.products,
      installmentCounts: copy.installmentCounts, feeMode: copy.feeMode,
    } } });
  }
  return { version: "mse-25.32", productVersion: "mse-25.41", enabled: true, readOnly: true, writes: false, proposals, skipped };
}

module.exports = { ALLOWED_FEE_MODES, ALLOWED_PRODUCTS, buildPublicPaymentCopy, classifyPlacement, formatInstallmentClaim, hasFlexiblePaymentBlock, normalizePaymentPolicy, planPaymentPlacements, validatePaymentPolicyInput };
