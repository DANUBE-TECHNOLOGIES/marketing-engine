import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const requiredFiles = [
  "lib/seo/local-page-seo.js",
  "lib/seo/local-search-intent.js",
  "lib/seo/local-search-signals.js",
  "lib/seo/json-ld.js",
  "app/sitemap.js",
];

const failures = [];
const sources = new Map();
for (const relative of requiredFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`missing:${relative}`);
    continue;
  }
  sources.set(relative, fs.readFileSync(full, "utf8"));
}

function requireMatch(file, pattern, label) {
  const source = sources.get(file) || "";
  if (!pattern.test(source)) failures.push(`${label}:${file}`);
}

function forbidMatch(file, pattern, label) {
  const source = sources.get(file) || "";
  if (pattern.test(source)) failures.push(`${label}:${file}`);
}

requireMatch("lib/seo/local-page-seo.js", /Agence de voyages à \$\{city\}/, "missing-local-title");
requireMatch("lib/seo/json-ld.js", /TravelAgency/, "missing-travel-agency-schema");
requireMatch("lib/seo/json-ld.js", /areaServed/, "missing-area-served");
requireMatch("lib/seo/local-search-signals.js", /postalCode/, "missing-nap-postal-code");
requireMatch("lib/seo/local-search-intent.js", /billet avion/, "missing-ticketing-intent");
requireMatch("lib/seo/local-search-intent.js", /voyage en groupe/, "missing-group-intent");
forbidMatch("app/sitemap.js", /targetCities.*map.*url/s, "doorway-target-city-route");
forbidMatch("app/sitemap.js", /nearby.*map.*url/s, "doorway-nearby-route");

if (failures.length) {
  console.error("MSE_25_117_LOCAL_SEARCH_CONTRACT=FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("MSE_25_117_LOCAL_SEARCH_CONTRACT=OK");
