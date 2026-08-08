"use strict";

const {
  PublicBrandLegalResolver,

  BRAND_ASSET_RELATIONS,
  BRAND_RESOLVABLE_FIELDS,
  LEGAL_RESOLVABLE_FIELDS,

  mergeDefinedFields,
  normalizePublicAsset,
  resolveAsset,
  buildCssVariables,
  buildCssText,
  buildMetadata,
} = require("./resolver");

const {
  publicBrandLegalError,
} = require("./errors");

const {
  modelFields,
  agencySiteSelect,
  normalizeSiteSlug,
  normalizeAgencyId,
  findSiteBySlug,
  findSiteByAgencyId,
  publicSiteContract,
} = require("./site-lookup");

module.exports = {
  PublicBrandLegalResolver,

  BRAND_ASSET_RELATIONS,
  BRAND_RESOLVABLE_FIELDS,
  LEGAL_RESOLVABLE_FIELDS,

  mergeDefinedFields,
  normalizePublicAsset,
  resolveAsset,
  buildCssVariables,
  buildCssText,
  buildMetadata,

  publicBrandLegalError,

  modelFields,
  agencySiteSelect,
  normalizeSiteSlug,
  normalizeAgencyId,
  findSiteBySlug,
  findSiteByAgencyId,
  publicSiteContract,
};
