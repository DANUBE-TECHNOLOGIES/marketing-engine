"use strict";

const {
  CONTENT_SOURCES,
} =
  require(
    "./constants"
  );

function normalizeSectionType(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase();
}

function extractContentMeta(
  section
) {
  const content =
    section?.content;

  if (
    content &&
    typeof content ===
      "object" &&
    !Array.isArray(
      content
    ) &&
    content.meta &&
    typeof content.meta ===
      "object"
  ) {
    return content.meta;
  }

  return null;
}

function contentSource(
  section
) {
  return (
    extractContentMeta(
      section
    )?.source ||
    null
  );
}

function isGeneratedContent(
  section
) {
  const source =
    contentSource(
      section
    );

  return (
    source ===
      CONTENT_SOURCES.DEFAULT ||
    source ===
      CONTENT_SOURCES.AI
  );
}

function isHumanContent(
  section
) {
  const source =
    contentSource(
      section
    );

  /*
   * Toute section sans provenance explicite est considérée
   * comme historique/humaine.
   *
   * C'est volontairement conservateur :
   * on préfère ne pas écraser plutôt que perdre un contenu
   * préexistant.
   */
  return (
    source ===
      CONTENT_SOURCES.HUMAN ||
    source ===
      CONTENT_SOURCES.IMPORTED ||
    source ===
      null
  );
}

function canCreateSection({
  existingSection,
} = {}) {
  return !existingSection;
}

function canRefreshSection({
  existingSection,
  allowGeneratedRefresh =
    false,
} = {}) {
  if (!existingSection) {
    return false;
  }

  if (
    allowGeneratedRefresh !==
    true
  ) {
    return false;
  }

  return isGeneratedContent(
    existingSection
  );
}

function decideSectionAction({
  existingSection,
  generatedSection,
  allowGeneratedRefresh =
    false,
} = {}) {
  if (!generatedSection) {
    return {
      action:
        "ignore",

      reason:
        "NO_GENERATED_SECTION",
    };
  }

  if (
    canCreateSection({
      existingSection,
    })
  ) {
    return {
      action:
        "create",

      reason:
        "SECTION_MISSING",
    };
  }

  if (
    canRefreshSection({
      existingSection,
      allowGeneratedRefresh,
    })
  ) {
    return {
      action:
        "refresh",

      reason:
        "GENERATED_CONTENT_REFRESH_ALLOWED",
    };
  }

  return {
    action:
      "preserve",

    reason:
      isHumanContent(
        existingSection
      )
        ? "HUMAN_OR_LEGACY_CONTENT"
        : "EXISTING_CONTENT",
  };
}

module.exports = {
  normalizeSectionType,
  extractContentMeta,
  contentSource,
  isGeneratedContent,
  isHumanContent,
  canCreateSection,
  canRefreshSection,
  decideSectionAction,
};
