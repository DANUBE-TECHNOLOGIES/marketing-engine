"use strict";

const fs = require("node:fs");
const path = require("node:path");

function findProjectRoot(start = process.cwd()) {
  let current = path.resolve(start);

  while (true) {
    const markers = [
      "docker-compose.yml",
      "compose.yml",
      ".git",
      "backend",
      "frontend",
    ];

    const score = markers.reduce(
      (count, marker) =>
        count + (fs.existsSync(path.join(current, marker)) ? 1 : 0),
      0
    );

    if (score >= 2) return current;

    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error(
        "Racine du projet Mondescale introuvable. Lance la commande depuis le dépôt."
      );
    }

    current = parent;
  }
}

function ensureDirectories(root) {
  for (const directory of ["patches", "logs", "reports", "backups"]) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }
}

module.exports = { findProjectRoot, ensureDirectories };
