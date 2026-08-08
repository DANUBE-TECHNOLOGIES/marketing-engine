"use strict";

const getGoogleAccessToken = require("../../lib/googleAccessToken");

const CATEGORY_MAP = {
  COVER: "cover",
  PROFILE: "logo",
  LOGO: "logo",
  EXTERIOR: "exterior",
  INTERIOR: "interior",
  AT_WORK: "team",
  TEAM: "team",
  PRODUCT: "product",
};

function normalizeCategory(value) {
  return CATEGORY_MAP[String(value || "").toUpperCase()] || "other";
}

function normalizePhoto(mediaItem, index) {
  const dimensions = mediaItem.dimensions || {};
  const category = mediaItem.locationAssociation?.category || null;

  return {
    googleMediaName: mediaItem.name,
    category: normalizeCategory(category),
    sourceUrl: mediaItem.googleUrl || mediaItem.sourceUrl,
    thumbnailUrl: mediaItem.thumbnailUrl || mediaItem.googleUrl || null,
    width: Number(dimensions.widthPixels || 0) || null,
    height: Number(dimensions.heightPixels || 0) || null,
    attribution: mediaItem.attribution?.profileName || null,
    isPrimary: String(category || "").toUpperCase() === "COVER" || index === 0,
    position: index,
    metadata: mediaItem,
  };
}

class GoogleBusinessPhotoService {
  constructor(prisma, repository, tenantId) {
    this.prisma = prisma;
    this.repository = repository;
    this.tenantId = tenantId;
  }

  list(agencyId) {
    return this.repository.listByAgency(agencyId, this.tenantId);
  }

  async publicList(siteSlug) {
    const photos = await this.repository.listPublicBySiteSlug(
      siteSlug,
      this.tenantId
    );

    return {
      cover:
        photos.find((photo) => photo.category === "cover") ||
        photos.find((photo) => photo.isPrimary) ||
        photos[0] ||
        null,
      logo: photos.find((photo) => photo.category === "logo") || null,
      gallery: photos.filter((photo) => photo.category !== "logo"),
    };
  }

  async sync(agencyId) {
    const agency = await this.repository.findAgency(agencyId, this.tenantId);

    if (!agency) {
      const error = new Error("Agence introuvable.");
      error.statusCode = 404;
      error.code = "AGENCY_NOT_FOUND";
      throw error;
    }

    if (!agency.googleLocationId) {
      const error = new Error("Agence non reliée à Google Business Profile.");
      error.statusCode = 409;
      error.code = "GOOGLE_LOCATION_NOT_LINKED";
      throw error;
    }

    const token = await getGoogleAccessToken(this.prisma);
    const locationName = String(agency.googleLocationId).replace(/^\/+/, "");
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        body?.error?.message || "Échec de la synchronisation des photos Google."
      );
      error.statusCode = response.status;
      error.code = "GOOGLE_PHOTOS_SYNC_FAILED";
      throw error;
    }

    const items = Array.isArray(body.mediaItems) ? body.mediaItems : [];
    const photos = items
      .filter((item) => item?.name && (item.googleUrl || item.thumbnailUrl))
      .map(normalizePhoto);

    return this.repository.replaceAgencyPhotos(
      agency.id,
      this.tenantId,
      photos
    );
  }
}

module.exports = GoogleBusinessPhotoService;
