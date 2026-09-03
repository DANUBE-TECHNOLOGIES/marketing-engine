"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PATTERNS = {
  createTable:
    /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"([^"]+)"/gi,
  alterTable:
    /ALTER\s+TABLE(?:\s+ONLY)?\s+"([^"]+)"/gi,
  dropTable:
    /DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+"([^"]+)"/gi,
  createIndex:
    /CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+"[^"]+")?\s+ON\s+"([^"]+)"/gi,
  references:
    /REFERENCES\s+"([^"]+)"/gi,
  insertInto:
    /INSERT\s+INTO\s+"([^"]+)"/gi,
  update:
    /UPDATE\s+"([^"]+)"/gi,
  deleteFrom:
    /DELETE\s+FROM\s+"([^"]+)"/gi,
};

function matches(content, pattern) {
  const values = [];
  let match;

  pattern.lastIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    values.push(match[1]);
  }

  return values;
}

function parseMigration(file) {
  const content = fs.readFileSync(file, "utf8");

  return {
    file,
    name: path.basename(path.dirname(file)),
    creates: matches(content, PATTERNS.createTable),
    alters: matches(content, PATTERNS.alterTable),
    drops: matches(content, PATTERNS.dropTable),
    indexes: matches(content, PATTERNS.createIndex),
    references: matches(content, PATTERNS.references),
    inserts: matches(content, PATTERNS.insertInto),
    updates: matches(content, PATTERNS.update),
    deletes: matches(content, PATTERNS.deleteFrom),
  };
}

function listMigrationFiles(root) {
  const migrationsRoot = path.join(
    root,
    "backend",
    "prisma",
    "migrations"
  );

  if (!fs.existsSync(migrationsRoot)) {
    return [];
  }

  return fs
    .readdirSync(migrationsRoot, {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      path.join(
        migrationsRoot,
        entry.name,
        "migration.sql"
      )
    )
    .filter((file) => fs.existsSync(file))
    .sort();
}

module.exports = {
  parseMigration,
  listMigrationFiles,
};
