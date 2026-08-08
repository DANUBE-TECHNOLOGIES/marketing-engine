"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

export function normalizeInlineText(
  value,
  options = {}
) {
  const multiline =
    options.multiline === true;

  const maxLength = Number.isInteger(
    Number(options.maxLength)
  )
    ? Number(options.maxLength)
    : 5000;

  let normalized = String(
    value ?? ""
  )
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");

  if (multiline) {
    normalized = normalized
      .split("\n")
      .map((line) =>
        line
          .replace(/[ \t]+/g, " ")
          .trim()
      )
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    normalized = normalized
      .replace(/\s+/g, " ")
      .trim();
  }

  return normalized.slice(
    0,
    Math.max(0, maxLength)
  );
}

export function textToParagraphHtml(value) {
  const normalized =
    normalizeInlineText(
      value,
      {
        multiline: true,
        maxLength: 20000,
      }
    );

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p>${escapeHtml(
        paragraph
      ).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

export function htmlToInlineText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n?/g, "\n")
    .trim();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function updateBlockContentField(
  block,
  field,
  value,
  options = {}
) {
  if (!block?.id) {
    throw new BlockSdkError(
      "Le bloc à modifier est invalide.",
      "INLINE_BLOCK_REQUIRED"
    );
  }

  const normalizedField =
    String(field || "").trim();

  if (
    !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(
      normalizedField
    )
  ) {
    throw new BlockSdkError(
      `Champ inline invalide : ${normalizedField}.`,
      "INVALID_INLINE_FIELD",
      {
        field: normalizedField,
      }
    );
  }

  const normalizedValue =
    options.html === true
      ? textToParagraphHtml(value)
      : normalizeInlineText(
          value,
          options
        );

  return {
    ...clone(block),

    content: {
      ...(block.content || {}),
      [normalizedField]:
        normalizedValue,
    },
  };
}

export function inlineFieldDefinition(
  blockType,
  field
) {
  const definitions = {
    hero: {
      eyebrow: {
        multiline: false,
        maxLength: 80,
      },
      title: {
        multiline: false,
        maxLength: 120,
      },
      subtitle: {
        multiline: true,
        maxLength: 500,
      },
    },

    rich_text: {
      title: {
        multiline: false,
        maxLength: 140,
      },
      html: {
        multiline: true,
        maxLength: 10000,
        html: true,
      },
    },

    image_text: {
      title: {
        multiline: false,
        maxLength: 140,
      },
      text: {
        multiline: true,
        maxLength: 2000,
      },
    },

    features: {
      title: {
        multiline: false,
        maxLength: 140,
      },
    },

    gallery: {
      title: {
        multiline: false,
        maxLength: 140,
      },
    },

    faq: {
      title: {
        multiline: false,
        maxLength: 140,
      },
    },

    cta: {
      title: {
        multiline: false,
        maxLength: 140,
      },
      text: {
        multiline: true,
        maxLength: 1000,
      },
    },

    agency: {
      title: {
        multiline: false,
        maxLength: 140,
      },
    },
  };

  return (
    definitions?.[blockType]?.[field] ||
    {
      multiline: false,
      maxLength: 500,
    }
  );
}
