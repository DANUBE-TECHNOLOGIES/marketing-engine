"use strict";

const { createBackup } = require("../core/backup");

async function backup({ root, logger, args }) {
  const includeDatabase = args.includes("--database");

  const files = args
    .filter((arg) => !arg.startsWith("--"));

  const manifest = createBackup({
    root,
    patchId: "manual",
    files,
    includeDatabase,
    logger,
  });

  console.log(JSON.stringify(manifest, null, 2));
}

module.exports = backup;
