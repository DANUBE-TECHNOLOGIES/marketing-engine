"use strict";

const {
  PublicSiteReadService,
  fieldsFor,
  pickFields,
  normalizeSlug,
  publishedLike,
  normalizeBlock,
  normalizePage,
  destinationSlugFromItem,
  collectDestinationSlugs,
  enrichDestinationItem,
  enrichPagesWithDestinations,
} = require("./service");

const {
  createPublicSiteReadRouter,
} = require("./routes");

module.exports = {
  PublicSiteReadService,
  createPublicSiteReadRouter,
  fieldsFor,
  pickFields,
  normalizeSlug,
  publishedLike,
  normalizeBlock,
  normalizePage,
  destinationSlugFromItem,
  collectDestinationSlugs,
  enrichDestinationItem,
  enrichPagesWithDestinations,
};
