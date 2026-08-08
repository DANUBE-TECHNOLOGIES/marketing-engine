"use strict";

function outputError(
  message,
  code =
    "INVALID_AI_OUTPUT"
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.statusCode =
    502;

  return error;
}

function assertPlainObject(
  value,
  label
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    throw outputError(
      `${label} doit être un objet.`
    );
  }
}

function normalizeGeneratedSection(
  section
) {
  assertPlainObject(
    section,
    "section"
  );

  const sectionType =
    String(
      section.sectionType ||
      ""
    )
      .trim();

  if (!sectionType) {
    throw outputError(
      "sectionType obligatoire."
    );
  }

  assertPlainObject(
    section.content ||
    {},
    `content ${sectionType}`
  );

  return {
    sectionType,

    content:
      section.content ||
      {},

    metadata:
      section.metadata &&
      typeof section.metadata ===
        "object" &&
      !Array.isArray(
        section.metadata
      )
        ? section.metadata
        : {},
  };
}

function validateGeneratedContent(
  value
) {
  assertPlainObject(
    value,
    "sortie IA"
  );

  if (
    !Array.isArray(
      value.sections
    )
  ) {
    throw outputError(
      "sections doit être un tableau."
    );
  }

  const sections =
    value.sections.map(
      normalizeGeneratedSection
    );

  const seo =
    value.seo &&
    typeof value.seo ===
      "object" &&
    !Array.isArray(
      value.seo
    )
      ? value.seo
      : {};

  return {
    sections,
    seo,
  };
}

module.exports = {
  validateGeneratedContent,
  normalizeGeneratedSection,
};
