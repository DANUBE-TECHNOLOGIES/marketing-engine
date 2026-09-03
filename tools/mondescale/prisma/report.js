"use strict";

const fs = require("node:fs");
const path = require("node:path");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createHtmlReport(root, audit) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const output = path.join(
    root,
    "reports",
    "prisma",
    `${stamp}-migration-audit.html`
  );

  fs.mkdirSync(
    path.dirname(output),
    {
      recursive: true,
    }
  );

  const issues = audit.issues
    .map(
      (issue) => `
        <tr>
          <td>${escapeHtml(issue.type)}</td>
          <td>${escapeHtml(issue.migration)}</td>
          <td>${escapeHtml(issue.table)}</td>
          <td>${escapeHtml(issue.message)}</td>
        </tr>
      `
    )
    .join("");

  const warnings = audit.warnings
    .map(
      (warning) => `
        <tr>
          <td>${escapeHtml(warning.type)}</td>
          <td>${escapeHtml(warning.migration)}</td>
          <td>${escapeHtml(warning.table)}</td>
          <td>${escapeHtml(warning.message)}</td>
        </tr>
      `
    )
    .join("");

  const migrations = audit.migrations
    .map(
      (migration) => `
        <tr>
          <td>${escapeHtml(migration.name)}</td>
          <td>${escapeHtml(migration.creates.join(", ") || "—")}</td>
          <td>${escapeHtml(migration.alters.join(", ") || "—")}</td>
          <td>${escapeHtml(migration.references.join(", ") || "—")}</td>
        </tr>
      `
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Audit Prisma Mondescale</title>
  <style>
    body {
      margin: 0;
      padding: 36px;
      font-family: Arial, sans-serif;
      background: #f3f6f9;
      color: #102a43;
    }

    main {
      max-width: 1200px;
      margin: 0 auto;
    }

    .summary {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .card {
      padding: 20px;
      border-radius: 14px;
      background: white;
      box-shadow:
        0 12px 30px rgba(16, 42, 67, .08);
    }

    .status-valid {
      color: #19734b;
    }

    .status-invalid {
      color: #b42318;
    }

    table {
      width: 100%;
      margin: 18px 0 34px;
      border-collapse: collapse;
      background: white;
    }

    th,
    td {
      padding: 12px;
      border: 1px solid #dfe7ef;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #eef4fb;
    }

    code {
      font-size: .85rem;
    }
  </style>
</head>
<body>
<main>
  <h1>Audit Prisma Mondescale</h1>

  <p>
    Généré le ${escapeHtml(
      new Date().toISOString()
    )}
  </p>

  <div class="summary">
    <div class="card">
      <strong>Migrations</strong>
      <p>${audit.migrationCount}</p>
    </div>

    <div class="card">
      <strong>Tables détectées</strong>
      <p>${audit.tableCount}</p>
    </div>

    <div class="card">
      <strong>Erreurs</strong>
      <p>${audit.issues.length}</p>
    </div>

    <div class="card">
      <strong>Avertissements</strong>
      <p>${audit.warnings.length}</p>
    </div>
  </div>

  <h2 class="${
    audit.valid
      ? "status-valid"
      : "status-invalid"
  }">
    ${
      audit.valid
        ? "Audit valide"
        : "Audit invalide"
    }
  </h2>

  <h2>Erreurs</h2>
  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Migration</th>
        <th>Table</th>
        <th>Détail</th>
      </tr>
    </thead>
    <tbody>
      ${
        issues ||
        '<tr><td colspan="4">Aucune erreur</td></tr>'
      }
    </tbody>
  </table>

  <h2>Avertissements</h2>
  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Migration</th>
        <th>Table</th>
        <th>Détail</th>
      </tr>
    </thead>
    <tbody>
      ${
        warnings ||
        '<tr><td colspan="4">Aucun avertissement</td></tr>'
      }
    </tbody>
  </table>

  <h2>Migrations analysées</h2>
  <table>
    <thead>
      <tr>
        <th>Migration</th>
        <th>CREATE TABLE</th>
        <th>ALTER TABLE</th>
        <th>REFERENCES</th>
      </tr>
    </thead>
    <tbody>
      ${migrations}
    </tbody>
  </table>
</main>
</body>
</html>`;

  fs.writeFileSync(output, html);

  return output;
}

module.exports = {
  createHtmlReport,
};
