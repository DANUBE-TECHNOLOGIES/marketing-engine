"use strict";

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

  return cleanText(direct);
}

function toPublicOfferCard(asset) {
  const payload = asObject(asset?.payload);
  const nested = asObject(payload.offer);
  const source = {
    ...payload,
    ...nested,
  };

  const title = cleanText(source.title) || cleanText(asset?.title);
  if (!title) return null;

  const price = normalizeOfferPrice(source);
  const image =
    cleanText(source.image) ||
    cleanText(source.imageUrl) ||
    cleanText(source.heroImageUrl) ||
    cleanText(source.visualUrl);
  const href =
    cleanText(source.href) ||
    cleanText(source.url) ||
    cleanText(source.link);
  const description =
    cleanText(source.description) ||
    cleanText(source.summary);
  const badge =
    cleanText(source.badge) ||
    cleanText(source.label);

  const type = String(asset?.type || "").toLowerCase();
  const explicitOfferType = [
    "offer",
    "travel-offer",
    "deal",
    "promotion",
    "promo",
  ].includes(type);

  if (
    !explicitOfferType &&
    !price &&
    !image &&
    !href &&
    !description &&
    !badge
  ) {
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
  asObject,
  cleanText,
  normalizeOfferPrice,
  toPublicOfferCard,
};
