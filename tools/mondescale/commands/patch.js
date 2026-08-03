"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { findPatchById } = require("../core/manifest");
const { executePatchScript } = require("../core/runner");
const { markInstalled, markFailed, readState } = require("../core/state");

async function patch({ root, logger, args }) {
  const id = args[0];
  if (!id) throw new Error("Usage : mondescale patch <PATCH_ID>");

  const manifest = findPatchById(root, id);
  if (!manifest) throw new Error(`Patch introuvable : ${id}`);
  if (!manifest.validation?.valid) {
    throw new Error(`Manifeste invalide : ${manifest.validation?.errors?.join(", ") || "erreur inconnue"}`);
  }

  const state = readState(root);
  const installed = state.installed.find(
    (item) => item.id === manifest.id && item.version === manifest.version
  );

  if (installed && !args.includes("--force")) {
    console.log(`✓ ${manifest.id} ${manifest.version} est déjà installé.`);
    console.log("Utilise --force pour le réappliquer.");
    return;
  }

  const patchDirectory = path.dirname(manifest.file);
  const patchScript = path.join(patchDirectory, "patch.sh");
  if (!fs.existsSync(patchScript)) throw new Error(`Le patch ${id} ne contient pas de patch.sh`);

  console.log(`Application de ${manifest.id} — ${manifest.title}`);
  logger.info("Patch démarré", { id: manifest.id, version: manifest.version, file: manifest.file });

  try {
    executePatchScript({ root, patchDirectory, logger });
    markInstalled(root, manifest);
    logger.success("Patch installé", { id: manifest.id, version: manifest.version });
    console.log(`✓ ${manifest.id} installé avec succès.`);
  } catch (error) {
    markFailed(root, manifest, error);
    throw error;
  }
}

module.exports = patch;
