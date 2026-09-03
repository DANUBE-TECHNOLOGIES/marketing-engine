import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-page-seo.js"), "utf8");

test("MSE-25.117 keeps primary home title local and brand-qualified", () => {
  assert.match(source, /Agence de voyages à \$\{city\} \| \$\{brand\}/);
  assert.match(source, /Votre agence de voyages à \$\{city\}/);
});

test("MSE-25.117 local metadata does not inject target city lists into titles", () => {
  assert.doesNotMatch(source, /targetCities\(site\).*title/s);
});
