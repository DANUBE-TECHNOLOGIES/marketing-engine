"use strict";

const OFFER_ASSET_TYPES = Object.freeze([
  "offer",
  "site-offer",
  "travel-offer",
  "deal",
  "promotion",
  "promo",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeOfferPrice(source) {
  const direct =
    source.priceLabel ??
    source.price ??
    source.fromPrice ??
    null;

  if (direct === null || direct === undefined || direct === "") {
    return null;
  }

  const currency = cleanText(source.currency);

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return currency ? `${direct} ${currency}` : String(direct);
  }

  const price = cleanText(direct);

  if (!price || !currency) {
    return price;
  }

  return price.includes(currency)
    ? price
    : `${price} ${currency}`;
}

function toPublicOfferCard(asset) {
  const type = String(asset?.type || "").trim().toLowerCase();

  if (!OFFER_ASSET_TYPES.includes(type)) {
    return null;
  }

  const payload = asObject(asset?.payload);
  const nested = asObject(payload.offer);
  const source = {
    ...payload,
    ...nested,
  };

  const title = cleanText(source.title) || cleanText(asset?.title);
  if (!title) return null;

  const description =
    cleanText(source.description) ||
    cleanText(source.summary);
  const image =
    cleanText(source.image) ||
    cleanText(source.imageUrl) ||
    cleanText(source.heroImageUrl) ||
    cleanText(source.visualUrl);
  const badge =
    cleanText(source.badge) ||
    cleanText(source.label);
  const price = normalizeOfferPrice(source);
  const href =
    cleanText(source.href) ||
    cleanText(source.url) ||
    cleanText(source.link);

  if (!description && !image && !badge && !price && !href) {
    return null;
  }

  return {
    id: asset.id,
    campaignId: asset.campaignId,
    title,
    description,
    image,
    badge,
    price,
    href,
  };
}

module.exports = {
  OFFER_ASSET_TYPES,
  asObject,
  cleanText,
  normalizeOfferPrice,
  toPublicOfferCard,
};
