"use strict";

const { catalog } = require("../core/manifest");

async function list({ root, logger }) {
  const items = catalog(root);

  if (!items.length) {
    console.log("Aucun patch enregistré dans patches/.");
    logger.info("Catalogue vide");
    return;
  }

  console.log("ID\tVERSION\tSTATUT\tTITRE");

  for (const item of items) {
    const status = item.validation.valid ? "VALID" : "INVALID";
    console.log(
      `${item.id || "?"}\t${item.version || "?"}\t${status}\t${item.title || item.file}`
    );
  }

  logger.success(`${items.length} manifeste(s) inspecté(s)`);
}

module.exports = list;
