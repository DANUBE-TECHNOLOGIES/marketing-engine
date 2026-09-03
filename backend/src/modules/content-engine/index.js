"use strict";

const variables =
  require(
    "./variables"
  );


const defaultContent =
  require(
    "./default-content"
  );


const DefaultContentBuilder =
  require(
    "./default-content-builder"
  );

const {
  buildAgencyContext,
} =
  require(
    "./agency-context"
  );

const {
  buildGeneralSeo,
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

module.exports = {
  ...variables,
  ...defaultContent,
  DefaultContentBuilder,
  buildAgencyContext,
  buildGeneralSeo,
  contentEnvelope,
};
