"use strict";

function httpError(message, statusCode, code) {
  return Object.assign(new Error(message), {
    statusCode,
    code,
  });
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw httpError(
        "Le prix de l’offre est invalide.",
        400,
        "CAMPAIGN_OFFER_PRICE_INVALID"
      );
    }

    return value;
  }

  const text = clean(value);

  if (!text) return null;

  return text;
}

function normalizeHref(value) {
  const href = clean(value);

  if (!href) return null;

  if (/^(javascript:|data:|vbscript:)/i.test(href)) {
    throw httpError(
      "Le lien de l’offre utilise un protocole interdit.",
      400,
      "CAMPAIGN_OFFER_HREF_INVALID"
    );
  }

  return href;
}

function validateOfferAssetInput(input = {}) {
  const title = clean(input.title);

  if (!title) {
    throw httpError(
      "Le titre de l’offre est obligatoire.",
      400,
      "CAMPAIGN_OFFER_TITLE_REQUIRED"
    );
  }

  const payload = {
    title,
    description: clean(input.description),
    price: normalizePrice(input.price),
    currency: clean(input.currency),
    imageUrl: clean(input.imageUrl || input.image),
    href: normalizeHref(input.href || input.url),
    badge: clean(input.badge),
  };

  if (
    payload.price === null &&
    !payload.description &&
    !payload.imageUrl &&
    !payload.href &&
    !payload.badge
  ) {
    throw httpError(
      "L’offre doit contenir au moins un prix, une description, une image, un lien ou un badge.",
      400,
      "CAMPAIGN_OFFER_CONTENT_REQUIRED"
    );
  }

  return {
    title,
    payload,
  };
}

function assertOfferAssetPublishable(asset) {
  const type = String(asset?.type || "").toLowerCase();

  if (type !== "offer") {
    return asset;
  }

  validateOfferAssetInput({
    title: asset.title,
    ...(asset.payload && typeof asset.payload === "object"
      ? asset.payload
      : {}),
  });

  return asset;
}

module.exports = {
  clean,
  normalizePrice,
  normalizeHref,
  validateOfferAssetInput,
  assertOfferAssetPublishable,
};
