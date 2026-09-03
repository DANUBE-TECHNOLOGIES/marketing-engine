"use strict";

const path = require("node:path");

const {
  parseMigration,
  listMigrationFiles,
} = require("./parser");

const PRISMA_INTERNAL_TABLES = new Set([
  "_prisma_migrations",
]);

function auditMigrations(root) {
  const files = listMigrationFiles(root);
  const migrations = files.map(parseMigration);

  const knownTables = new Set(
    PRISMA_INTERNAL_TABLES
  );

  const createdBy = new Map();
  const issues = [];
  const warnings = [];

  for (const migration of migrations) {
    for (const table of migration.creates) {
      if (createdBy.has(table)) {
        warnings.push({
          type: "TABLE_CREATED_MULTIPLE_TIMES",
          migration: migration.name,
          table,
          previousMigration:
            createdBy.get(table),
          message:
            `La table "${table}" est créée plusieurs fois.`,
        });
      }

      knownTables.add(table);
      createdBy.set(
        table,
        migration.name
      );
    }

    const usedTables = new Set([
      ...migration.alters,
      ...migration.indexes,
      ...migration.references,
      ...migration.inserts,
      ...migration.updates,
      ...migration.deletes,
    ]);

    for (const table of usedTables) {
      if (knownTables.has(table)) {
        continue;
      }

      const futureCreator = migrations
        .slice(
          migrations.indexOf(migration) + 1
        )
        .find((candidate) =>
          candidate.creates.includes(table)
        );

      issues.push({
        type: futureCreator
          ? "TABLE_USED_BEFORE_CREATION"
          : "TABLE_NOT_CREATED_IN_HISTORY",
        migration: migration.name,
        table,
        futureMigration:
          futureCreator?.name || null,
        message: futureCreator
          ? `La table "${table}" est utilisée avant sa création dans ${futureCreator.name}.`
          : `La table "${table}" est utilisée mais aucune migration précédente ne la crée.`,
      });
    }

    for (const table of migration.drops) {
      if (!knownTables.has(table)) {
        warnings.push({
          type: "DROP_UNKNOWN_TABLE",
          migration: migration.name,
          table,
          message:
            `La migration supprime une table non connue : "${table}".`,
        });
      }

      knownTables.delete(table);
    }
  }

  return {
    root,
    migrationsRoot: path.join(
      root,
      "backend",
      "prisma",
      "migrations"
    ),
    migrationCount:
      migrations.length,
    tableCount:
      createdBy.size,
    migrations,
    issues,
    warnings,
    valid:
      issues.length === 0,
  };
}

module.exports = {
  auditMigrations,
};
