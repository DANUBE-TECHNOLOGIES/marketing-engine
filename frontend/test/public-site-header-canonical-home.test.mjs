import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const headerPath = path.join(
  dirname,
  "../components/public-site/PublicSiteHeader.js"
);
const source = fs.readFileSync(headerPath, "utf8");

test("home aliases resolve to the canonical mini-site root", () => {
  assert.match(source, /\["home", "accueil", "index"\]\.includes\(slug\)/);
  assert.match(source, /return `\/agence\/\$\{siteSlug\}`/);
});
