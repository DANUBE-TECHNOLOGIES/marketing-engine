"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseScalar(value) {
  const trimmed = String(value).trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) return trimmed.slice(1, -1);

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  return trimmed;
}

function parseSimpleYaml(content) {
  const result = {};
  let currentArray = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.replace(/\t/g, "  ").trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ")) {
      if (!currentArray) {
        throw new Error(`Entrée de liste sans clé parente : ${trimmed}`);
      }

      currentArray.push(parseScalar(trimmed.slice(2)));
      continue;
    }

    const separator = trimmed.indexOf(":");

    if (separator === -1) {
      throw new Error(`Ligne YAML non prise en charge : ${trimmed}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();

    if (!rawValue) {
      result[key] = [];
      currentArray = result[key];
    } else {
      result[key] = parseScalar(rawValue);
      currentArray = null;
    }
  }

  return result;
}

function loadManifest(file) {
  const content = fs.readFileSync(file, "utf8");

  if (file.endsWith(".json")) return JSON.parse(content);
  if (file.endsWith(".yml") || file.endsWith(".yaml")) {
    return parseSimpleYaml(content);
  }

  throw new Error(`Format de manifeste non pris en charge : ${file}`);
}

function findManifestFiles(root) {
  const patchesRoot = path.join(root, "patches");

  if (!fs.existsSync(patchesRoot)) return [];

  const results = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/^manifest\.(json|ya?ml)$/i.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(patchesRoot);
  return results.sort();
}

function validateManifest(manifest, file) {
  const errors = [];

  for (const key of ["id", "title", "version"]) {
    if (!manifest[key]) errors.push(`champ obligatoire manquant : ${key}`);
  }

  if (
    manifest.requires !== undefined &&
    !Array.isArray(manifest.requires)
  ) errors.push("requires doit être une liste");

  if (
    manifest.steps !== undefined &&
    !Array.isArray(manifest.steps)
  ) errors.push("steps doit être une liste");

  return { valid: errors.length === 0, file, errors };
}

function catalog(root) {
  return findManifestFiles(root).map((file) => {
    try {
      const manifest = loadManifest(file);
      return {
        ...manifest,
        file,
        validation: validateManifest(manifest, file),
      };
    } catch (error) {
      return {
        file,
        validation: {
          valid: false,
          file,
          errors: [error.message],
        },
      };
    }
  });
}

module.exports = {
  loadManifest,
  findManifestFiles,
  validateManifest,
  catalog,
};
