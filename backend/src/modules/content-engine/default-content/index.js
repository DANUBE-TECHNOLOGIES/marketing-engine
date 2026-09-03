"use strict";

const {
  renderTemplate,
  renderContentObject,
} =
  require(
    "./template-renderer"
  );

const DefaultContentBuilder =
  require(
    "./default-content-builder"
  );

const {
  DefaultContentAdapter,
  existingSectionsMap,
  normalizePageType,
} =
  require(
    "./adapter"
  );

const {
  buildAgencyContext,
  clean,
  addressLine,
  telephoneHref,
  emailHref,
} =
  require(
    "./agency-context"
  );

const {
  buildGeneralSeo,
  truncate,
} =
  require(
    "./seo-builder"
  );

const {
  contentEnvelope,
} =
  require(
    "./content-envelope"
  );

const {
  CONTENT_ENGINE_VERSION,
  CONTENT_SOURCES,
  GENERAL_PAGE_TYPES,
  DEFAULT_SERVICES,
  DEFAULT_TRUST_ITEMS,
} =
  require(
    "./constants"
  );

const {
  normalizeSectionType,
  extractContentMeta,
  contentSource,
  isGeneratedContent,
  isHumanContent,
  canCreateSection,
  canRefreshSection,
  decideSectionAction,
} =
  require(
    "./merge-policy"
  );

module.exports = {
  /*
   * Builders
   */
  DefaultContentBuilder,
  DefaultContentAdapter,

  /*
   * Adapter helpers
   */
  existingSectionsMap,
  normalizePageType,

  /*
   * Agency context
   */
  buildAgencyContext,
  clean,
  addressLine,
  telephoneHref,
  emailHref,

  /*
   * SEO
   */
  buildGeneralSeo,
  truncate,

  /*
   * Content provenance
   */
  contentEnvelope,

  /*
   * Merge policy
   */
  normalizeSectionType,
  extractContentMeta,
  contentSource,
  isGeneratedContent,
  isHumanContent,
  canCreateSection,
  canRefreshSection,
  decideSectionAction,

  /*
   * Constants
   */
  CONTENT_ENGINE_VERSION,
  CONTENT_SOURCES,
  GENERAL_PAGE_TYPES,
  DEFAULT_SERVICES,
  DEFAULT_TRUST_ITEMS,
};
