"use strict";

const {
  brandAssetError,
} = require("./errors");

const ALLOWED_MIME_TYPES =
  Object.freeze([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
  ]);

const EXTENSION_BY_MIME =
  Object.freeze({
    "image/png":
      "png",

    "image/jpeg":
      "jpg",

    "image/webp":
      "webp",

    "image/svg+xml":
      "svg",

    "application/pdf":
      "pdf",
  });

function startsWithBytes(
  buffer,
  expected
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length <
      expected.length
  ) {
    return false;
  }

  return expected.every(
    (
      value,
      index
    ) =>
      buffer[index] ===
      value
  );
}

function isPng(
  buffer
) {
  return startsWithBytes(
    buffer,
    [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]
  );
}

function isJpeg(
  buffer
) {
  return startsWithBytes(
    buffer,
    [
      0xff,
      0xd8,
      0xff,
    ]
  );
}

function isWebp(
  buffer
) {
  return (
    buffer.length >= 12 &&
    buffer
      .subarray(
        0,
        4
      )
      .toString("ascii") ===
      "RIFF" &&
    buffer
      .subarray(
        8,
        12
      )
      .toString("ascii") ===
      "WEBP"
  );
}

function isPdf(
  buffer
) {
  return (
    buffer.length >= 5 &&
    buffer
      .subarray(
        0,
        5
      )
      .toString("ascii") ===
      "%PDF-"
  );
}

function isSvg(
  buffer
) {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length
  ) {
    return false;
  }

  const beginning =
    buffer
      .subarray(
        0,
        Math.min(
          buffer.length,
          4096
        )
      )
      .toString("utf8")
      .replace(
        /^\uFEFF/,
        ""
      )
      .trimStart();

  return (
    beginning.startsWith(
      "<svg"
    ) ||
    (
      beginning.startsWith(
        "<?xml"
      ) &&
      /<svg[\s>]/i.test(
        beginning
      )
    )
  );
}

function detectMimeType(
  buffer
) {
  if (isPng(buffer)) {
    return "image/png";
  }

  if (isJpeg(buffer)) {
    return "image/jpeg";
  }

  if (isWebp(buffer)) {
    return "image/webp";
  }

  if (isPdf(buffer)) {
    return "application/pdf";
  }

  if (isSvg(buffer)) {
    return "image/svg+xml";
  }

  return null;
}

function validateFileSignature({
  buffer,
  declaredMimeType,
}) {
  if (
    !Buffer.isBuffer(buffer)
  ) {
    throw brandAssetError(
      "BRAND_ASSET_BUFFER_REQUIRED",
      "Le contenu binaire du fichier est obligatoire."
    );
  }

  const detectedMimeType =
    detectMimeType(buffer);

  if (!detectedMimeType) {
    throw brandAssetError(
      "BRAND_ASSET_UNSUPPORTED_FILE",
      "Le format réel du fichier n’est pas pris en charge."
    );
  }

  if (
    !ALLOWED_MIME_TYPES
      .includes(
        detectedMimeType
      )
  ) {
    throw brandAssetError(
      "BRAND_ASSET_MIME_NOT_ALLOWED",
      `Le type ${detectedMimeType} n’est pas autorisé.`,
      {
        detectedMimeType,
      }
    );
  }

  const normalizedDeclared =
    String(
      declaredMimeType ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    normalizedDeclared &&
    normalizedDeclared !==
      detectedMimeType
  ) {
    const jpegAliases =
      new Set([
        "image/jpeg",
        "image/jpg",
        "image/pjpeg",
      ]);

    const compatibleJpeg =
      detectedMimeType ===
        "image/jpeg" &&
      jpegAliases.has(
        normalizedDeclared
      );

    if (!compatibleJpeg) {
      throw brandAssetError(
        "BRAND_ASSET_MIME_MISMATCH",
        "Le type déclaré ne correspond pas au contenu réel du fichier.",
        {
          declaredMimeType:
            normalizedDeclared,

          detectedMimeType,
        }
      );
    }
  }

  return {
    mimeType:
      detectedMimeType,

    extension:
      EXTENSION_BY_MIME[
        detectedMimeType
      ],
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  EXTENSION_BY_MIME,
  detectMimeType,
  validateFileSignature,
};
