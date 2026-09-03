import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.117 intent map covers existing commercial surfaces", () => {
  const source = read("lib/seo/local-search-intent-map.js");
  for (const route of ["services", "billetterie", "voyages-en-groupe", "business-travel", "destinations", "inspirations", "contact"]) {
    assert.match(source, new RegExp(`\\"${route}\\"`));
  }
});

test("MSE-25.117 intent map audits cannibalisation without generating routes", () => {
  const source = read("lib/seo/local-search-intent-map.js");
  assert.match(source, /duplicatePrimaryQueries/);
  assert.doesNotMatch(source, /mkdir|writeFile|router\.push|redirect\(/i);
});
