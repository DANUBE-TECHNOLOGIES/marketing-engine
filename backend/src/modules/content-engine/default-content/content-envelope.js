"use strict";

const {
  CONTENT_ENGINE_VERSION,
  CONTENT_SOURCES,
} =
  require(
    "./constants"
  );

function contentEnvelope(
  content,
  {
    source =
      CONTENT_SOURCES.DEFAULT,

    editable =
      true,

    variables =
      {},

    generatedAt =
      new Date()
        .toISOString(),

    generatorVersion =
      CONTENT_ENGINE_VERSION,
  } = {}
) {
  return {
    content,

    meta: {
      source,

      editable:
        editable ===
        true,

      generator:
        "mondescale-content-engine",

      generatorVersion,

      generatedAt,

      variables,
    },
  };
}

module.exports = {
  contentEnvelope,
};
