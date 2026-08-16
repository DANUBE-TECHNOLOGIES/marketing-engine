import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const publicRoot = path.join(frontendRoot, "public");
const cataloguePath = path.join(
  frontendRoot,
  "components/page-builder/shared/fullPartners.js"
);

async function loadCatalogue() {
  const source = fs.readFileSync(cataloguePath, "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const module = await import(dataUrl);
  return Array.isArray(module.FULL_PARTNERS) ? module.FULL_PARTNERS : [];
}

const FULL_PARTNERS = await loadCatalogue();

const rows = FULL_PARTNERS.map((partner) => {
  const logoUrl = String(partner.logoUrl || "").trim();
  const relativePath = logoUrl.startsWith("/") ? logoUrl.slice(1) : logoUrl;
  const filePath = relativePath ? path.join(publicRoot, relativePath) : null;
  const exists = Boolean(filePath && fs.existsSync(filePath));

  return {
    id: partner.id,
    name: partner.name,
    category: partner.category,
    logoUrl: logoUrl || null,
    fileUrl: filePath ? pathToFileURL(filePath).href : null,
    state: !logoUrl ? "missing" : exists ? "ready" : "broken-reference",
  };
});

const summary = rows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.state] += 1;
    return acc;
  },
  { total: 0, ready: 0, missing: 0, "broken-reference": 0 }
);

summary.coverage = summary.total ? Number((summary.ready / summary.total).toFixed(4)) : 1;

const payload = {
  policy: "individual-assets-only",
  fallback: "initials",
  summary,
  byCategory: Object.fromEntries(
    [...new Set(rows.map((row) => row.category))].map((category) => {
      const categoryRows = rows.filter((row) => row.category === category);
      const ready = categoryRows.filter((row) => row.state === "ready").length;
      return [
        category,
        {
          total: categoryRows.length,
          ready,
          missing: categoryRows.filter((row) => row.state === "missing").length,
          brokenReferences: categoryRows.filter((row) => row.state === "broken-reference").length,
          coverage: categoryRows.length ? Number((ready / categoryRows.length).toFixed(4)) : 1,
        },
      ];
    })
  ),
  missing: rows.filter((row) => row.state === "missing"),
  brokenReferences: rows.filter((row) => row.state === "broken-reference"),
};

console.log(JSON.stringify(payload, null, 2));

if (payload.brokenReferences.length) {
  process.exitCode = 2;
}
