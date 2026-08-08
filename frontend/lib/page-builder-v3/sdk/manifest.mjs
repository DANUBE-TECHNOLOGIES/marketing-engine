import { BlockSdkError } from "./errors.mjs";

const TYPE_PATTERN = /^[a-z][a-z0-9_-]*$/;

const VALID_CATEGORIES = new Set([
  "structure",
  "content",
  "media",
  "conversion",
  "seo",
  "travel",
  "trust",
]);

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

export function validateManifest(input) {
  if (!isPlainObject(input)) {
    throw new BlockSdkError(
      "Le manifest doit être un objet.",
      "INVALID_BLOCK_MANIFEST"
    );
  }

  const type = String(input.type || "")
    .trim()
    .toLowerCase();

  if (!TYPE_PATTERN.test(type)) {
    throw new BlockSdkError(
      `Type de bloc invalide : ${type || "(vide)"}.`,
      "INVALID_BLOCK_TYPE",
      { type }
    );
  }

  const label = String(input.label || "").trim();

  if (!label) {
    throw new BlockSdkError(
      `Le bloc ${type} doit posséder un libellé.`,
      "BLOCK_LABEL_REQUIRED",
      { type }
    );
  }

  const category = String(
    input.category || "content"
  )
    .trim()
    .toLowerCase();

  if (!VALID_CATEGORIES.has(category)) {
    throw new BlockSdkError(
      `Catégorie inconnue : ${category}.`,
      "INVALID_BLOCK_CATEGORY",
      {
        type,
        category,
        allowed: [...VALID_CATEGORIES],
      }
    );
  }

  if (
    input.defaults !== undefined &&
    !isPlainObject(input.defaults)
  ) {
    throw new BlockSdkError(
      `Les valeurs par défaut de ${type} doivent être un objet.`,
      "INVALID_BLOCK_DEFAULTS",
      { type }
    );
  }

  if (
    input.schema !== undefined &&
    !isPlainObject(input.schema)
  ) {
    throw new BlockSdkError(
      `Le schéma de ${type} doit être un objet.`,
      "INVALID_BLOCK_SCHEMA",
      { type }
    );
  }

  return Object.freeze({
    version: String(input.version || "1.0.0"),
    type,
    label,
    description: String(
      input.description || ""
    ).trim(),
    category,
    icon: String(input.icon || "□"),
    singleton: input.singleton === true,
    defaults: clone(input.defaults || {}),
    schema: clone(input.schema || {}),
    capabilities: Object.freeze({
      duplicable:
        input.capabilities?.duplicable !== false,
      deletable:
        input.capabilities?.deletable !== false,
      movable:
        input.capabilities?.movable !== false,
      responsive:
        input.capabilities?.responsive !== false,
      ai:
        input.capabilities?.ai === true,
    }),
  });
}

export function createBlockFromManifest(
  manifest,
  overrides = {}
) {
  const validated = validateManifest(manifest);

  return {
    id: String(
      overrides.id ||
      `block-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`
    ),

    type: validated.type,

    status: String(
      overrides.status || "draft"
    ),

    position: Number.isInteger(
      Number(overrides.position)
    )
      ? Number(overrides.position)
      : 0,

    content: {
      ...clone(validated.defaults),
      ...(isPlainObject(overrides.content)
        ? clone(overrides.content)
        : {}),
    },

    settings: isPlainObject(overrides.settings)
      ? clone(overrides.settings)
      : {},
  };
}

export { clone, isPlainObject };
