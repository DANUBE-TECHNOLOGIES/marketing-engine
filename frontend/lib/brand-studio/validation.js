import {
  ALLOWED_BRAND_ASSET_MIME_TYPES,
  BRAND_PROFILE_COLOR_FIELDS,
  MAX_BRAND_ASSET_SIZE,
} from "./constants.js";

export function validateBrandAssetFile(
  file,
  {
    maxSize =
      MAX_BRAND_ASSET_SIZE,

    allowedMimeTypes =
      ALLOWED_BRAND_ASSET_MIME_TYPES,
  } = {}
) {
  const errors = [];

  if (!file) {
    errors.push({
      code:
        "FILE_REQUIRED",

      message:
        "Sélectionnez un fichier.",
    });

    return errors;
  }

  if (
    !allowedMimeTypes.includes(
      file.type
    )
  ) {
    errors.push({
      code:
        "FILE_TYPE_INVALID",

      message:
        "Ce format de fichier n’est pas autorisé.",
    });
  }

  if (
    file.size >
    maxSize
  ) {
    errors.push({
      code:
        "FILE_TOO_LARGE",

      message:
        `Le fichier dépasse ${Math.round(
          maxSize /
          1024 /
          1024
        )} Mo.`,
    });
  }

  if (!file.size) {
    errors.push({
      code:
        "FILE_EMPTY",

      message:
        "Le fichier est vide.",
    });
  }

  return errors;
}

export function normalizeHexColor(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase();

  return /^#[0-9A-F]{6}$/.test(
    normalized
  )
    ? normalized
    : null;
}

export function validateBrandProfile(
  profile
) {
  const errors = {};

  for (
    const field
    of BRAND_PROFILE_COLOR_FIELDS
  ) {
    const value =
      profile?.[field];

    if (
      value &&
      !normalizeHexColor(
        value
      )
    ) {
      errors[field] =
        "Utilisez le format #RRGGBB.";
    }
  }

  const radius =
    profile?.buttonRadius;

  if (
    radius !== undefined &&
    radius !== null &&
    (
      !Number.isInteger(
        Number(radius)
      ) ||
      Number(radius) < 0 ||
      Number(radius) > 100
    )
  ) {
    errors.buttonRadius =
      "La valeur doit être comprise entre 0 et 100.";
  }

  return errors;
}

export function validateLegalProfile(
  profile
) {
  const errors = {};

  const email =
    String(
      profile
        ?.privacyContactEmail ||
      ""
    ).trim();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    errors.privacyContactEmail =
      "L’adresse électronique est invalide.";
  }

  const mediatorWebsite =
    String(
      profile
        ?.mediatorWebsite ||
      ""
    ).trim();

  if (mediatorWebsite) {
    try {
      const parsed =
        new URL(
          mediatorWebsite
        );

      if (
        ![
          "http:",
          "https:",
        ].includes(
          parsed.protocol
        )
      ) {
        errors.mediatorWebsite =
          "Utilisez une adresse HTTP ou HTTPS.";
      }
    } catch {
      errors.mediatorWebsite =
        "L’adresse URL est invalide.";
    }
  }

  return errors;
}
