import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const seoDir = path.join(root, "lib/seo");
const files = fs.readdirSync(seoDir).filter((name) => name.startsWith("local-search-") && name.endsWith(".js"));

test("MSE-25.117 runtime does not hard-code network agency cities", () => {
  const source = files.map((name) => fs.readFileSync(path.join(seoDir, name), "utf8")).join("\n");
  assert.doesNotMatch(source, /\b(Dax|Gien|Nevers|Maurepas|Lamorlaye|Ozoir|Bois-Colombes|Amilly|Melun|Clermont-Ferrand)\b/i);
});
