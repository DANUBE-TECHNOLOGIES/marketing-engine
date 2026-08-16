import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const { FULL_PARTNERS } = await loadModule("fullPartners.js");
const modules = [
  ["cruise", "partnerCruiseDetails.js"],
  ["circuit", "partnerCircuitDetails.js"],
  ["stay", "partnerStayDetails.js"],
  ["long-haul", "partnerLongHaulDetails.js"],
  ["france-europe", "partnerFranceEuropeDetails.js"],
  ["fallback", "partnerDetails.js"],
];

const loaded = await Promise.all(modules.map(async ([sourceName, fileName]) => {
  const module = await loadModule(fileName);
  const getter = Object.entries(module).find(([name, value]) => /^get.*PartnerDetails$/.test(name) && typeof value === "function")?.[1];
  return { sourceName, fileName, getter };
}));

const rows = FULL_PARTNERS.map((partner) => {
  const sources = loaded
    .filter(({ getter }) => getter?.(partner.id))
    .map(({ sourceName, fileName }) => ({ sourceName, fileName }));
  return { id: partner.id, name: partner.name, category: partner.category, sources };
});

const duplicates = rows.filter((row) => row.sources.length > 1);
const missing = rows.filter((row) => row.sources.length === 0);

console.log(JSON.stringify({
  policy: "one-editorial-detail-source-per-partner",
  summary: {
    total: rows.length,
    singleSource: rows.filter((row) => row.sources.length === 1).length,
    duplicateSources: duplicates.length,
    missingSources: missing.length,
  },
  duplicates,
  missing,
}, null, 2));

if (duplicates.length) process.exitCode = 2;
