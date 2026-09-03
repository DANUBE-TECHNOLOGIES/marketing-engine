"use strict";

const ALLOWED_MODES = new Set([
  "auto",
  "external",
  "deterministic",
]);

function createError(
  message,
  code,
  status = 400,
  details = {}
) {
  const error = new Error(message);

  error.code = code;
  error.status = status;
  error.details = details;

  return error;
}

function clean(value, maximum = 5000) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function normalizeMode(value) {
  const mode = clean(
    value || "auto",
    30
  ).toLowerCase();

  if (!ALLOWED_MODES.has(mode)) {
    throw createError(
      `Mode IA invalide : ${mode}.`,
      "EDITORIAL_AI_INVALID_MODE",
      400,
      {
        allowed:
          [...ALLOWED_MODES],
      }
    );
  }

  return mode;
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .slice(0, 100)
    .map((block, index) => ({
      id:
        clean(
          block?.id ||
          `block-${index}`,
          160
        ),

      type:
        clean(
          block?.type ||
          block?.blockType ||
          "rich_text",
          80
        ),

      position:
        Number.isFinite(
          Number(block?.position)
        )
          ? Number(block.position)
          : index,

      content:
        block?.content &&
        typeof block.content ===
          "object" &&
        !Array.isArray(block.content)
          ? block.content
          : {},
    }));
}

function validateGeneratePayload(
  input
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw createError(
      "Le payload éditorial est invalide.",
      "EDITORIAL_AI_INVALID_PAYLOAD"
    );
  }

  const page =
    input.page &&
    typeof input.page === "object" &&
    !Array.isArray(input.page)
      ? input.page
      : {};

  const context =
    input.context &&
    typeof input.context === "object" &&
    !Array.isArray(input.context)
      ? input.context
      : {};

  const destination =
    clean(
      context.destination,
      180
    );

  if (!destination) {
    throw createError(
      "La destination est obligatoire.",
      "EDITORIAL_AI_DESTINATION_REQUIRED"
    );
  }

  return {
    mode:
      normalizeMode(input.mode),

    page: {
      id:
        clean(page.id, 160),

      title:
        clean(page.title, 180),

      slug:
        clean(page.slug, 120),

      seoTitle:
        clean(page.seoTitle, 100),

      seoDescription:
        clean(
          page.seoDescription,
          300
        ),

      blocks:
        normalizeBlocks(
          page.blocks
        ),
    },

    context: {
      destination,

      agency:
        clean(
          context.agency ||
          context.agencyName,
          180
        ),

      intent:
        clean(
          context.intent ||
          "voyage sur mesure",
          180
        ),

      tone:
        clean(
          context.tone ||
          "professionnel, humain et inspirant",
          180
        ),

      locale:
        clean(
          context.locale ||
          "fr-FR",
          30
        ),

      travelCore:
        context.travelCore &&
        typeof context.travelCore === "object" &&
        !Array.isArray(context.travelCore)
          ? context.travelCore
          : null,
    },
  };
}

module.exports = {
  ALLOWED_MODES,
  clean,
  createError,
  normalizeMode,
  validateGeneratePayload,
};
