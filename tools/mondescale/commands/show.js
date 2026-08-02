"use strict";

const path = require("node:path");
const { catalog } = require("../core/manifest");

async function show({ root, logger, args }) {
  const id = args[0];

  if (!id) throw new Error("Usage : mondescale show <PATCH_ID>");

  const item = catalog(root).find((manifest) => manifest.id === id);

  if (!item) throw new Error(`Patch introuvable : ${id}`);

  console.log(JSON.stringify({
    id: item.id,
    title: item.title,
    version: item.version,
    description: item.description || null,
    requires: item.requires || [],
    steps: item.steps || [],
    rollback: item.rollback ?? false,
    manifest: path.relative(root, item.file),
    validation: item.validation,
  }, null, 2));

  logger.success(`Manifeste affiché : ${id}`);
}

module.exports = show;
