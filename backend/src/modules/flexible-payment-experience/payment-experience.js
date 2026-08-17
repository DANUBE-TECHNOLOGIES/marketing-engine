"use strict";

const ALLOWED_PRODUCTS = new Set(["flight", "travel"]);
const ALLOWED_FEE_MODES = new Set(["unspecified", "with-fees", "without-fees"]);
const FLIGHT_PAGE_SLUGS = new Set([
  "billetterie",
  "billetterie-vols",
  "billetterie-et-vols",
  "vols",
  "flight",
  "flights",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePaymentPolicy(input = {}) {
  const enabled = input.enabled === true;
  const products = [...new Set(Array.isArray(input.products) ? input.products : [])]
    .map((value) => normalizeText(value).toLowerCase())
    .filter((value) => ALLOWED_PRODUCTS.has(value));

  const installmentCounts = [...new Set(Array.isArray(input.installmentCounts) ? input.installmentCounts : [])]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 2 && value <= 24)
    .sort((a, b) => a - b);

  const requestedFeeMode = normalizeText(input.feeMode).toLowerCase();
  const feeMode = ALLOWED_FEE_MODES.has(requestedFeeMode) ? requestedFeeMode : "unspecified";

  return {
    enabled,
    products,
    installmentCounts,
    feeMode,
    disclaimer: normalizeText(input.disclaimer),
    ctaLabel: normalizeText(input.ctaLabel) || "Contacter mon agence",
  };
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

  let title;
  if (includesFlight && includesTravel) {
    title = "Vos billets d’avion et vos voyages, payables en plusieurs fois";
  } else if (includesFlight) {
    title = "Vos billets d’avion, payables en plusieurs fois";
  } else {
    title = "Votre voyage, payable en plusieurs fois";
  }

  let body;
  if (installmentClaim) {
    body = `Selon votre réservation et les conditions proposées par votre agence, un règlement en ${installmentClaim}${feeClaim} peut être disponible.`;
  } else {
    body = "Selon votre réservation et les possibilités proposées par votre agence, un règlement échelonné peut être disponible.";
  }

  return {
    title,
    body,
    disclaimer: policy.disclaimer,
    ctaLabel: policy.ctaLabel,
    products: policy.products,
    installmentCounts: policy.installmentCounts,
    feeMode: policy.feeMode,
  };
}

function isPublishedPage(page) {
  return page && (page.published === true || page.status === "published");
}

function hasFlexiblePaymentBlock(page) {
  return Array.isArray(page?.blocks) && page.blocks.some((block) => {
    const type = normalizeText(block?.blockType || block?.type).toLowerCase();
    return type === "flexible_payment" || type === "flexible-payment";
  });
}

function classifyPlacement(page = {}) {
  const slug = normalizeText(page.slug).toLowerCase();
  if (slug === "home" || slug === "accueil") return "compact";
  if (FLIGHT_PAGE_SLUGS.has(slug) || slug.includes("billetterie") || slug.includes("vol")) return "enriched";
  return null;
}

function planPaymentPlacements({ site = {}, policy: inputPolicy = {} } = {}) {
  const policy = normalizePaymentPolicy(inputPolicy);
  const copy = buildPublicPaymentCopy(policy);

  if (!copy) {
    return {
      version: "mse-25.32",
      enabled: false,
      proposals: [],
      skipped: [],
    };
  }

  const pages = Array.isArray(site.pages) ? site.pages : [];
  const proposals = [];
  const skipped = [];

  for (const page of pages) {
    if (!isPublishedPage(page)) {
      skipped.push({ slug: page?.slug || null, reason: "page-not-published" });
      continue;
    }

    const placement = classifyPlacement(page);
    if (!placement) continue;

    if (hasFlexiblePaymentBlock(page)) {
      skipped.push({ slug: page.slug, reason: "flexible-payment-block-already-present" });
      continue;
    }

    proposals.push({
      slug: page.slug,
      placement,
      block: {
        blockType: "flexible_payment",
        content: {
          variant: placement,
          title: copy.title,
          body: copy.body,
          disclaimer: copy.disclaimer,
          ctaLabel: copy.ctaLabel,
          products: copy.products,
          installmentCounts: copy.installmentCounts,
          feeMode: copy.feeMode,
        },
      },
    });
  }

  return {
    version: "mse-25.32",
    enabled: true,
    readOnly: true,
    writes: false,
    proposals,
    skipped,
  };
}

module.exports = {
  buildPublicPaymentCopy,
  classifyPlacement,
  formatInstallmentClaim,
  hasFlexiblePaymentBlock,
  normalizePaymentPolicy,
  planPaymentPlacements,
};
