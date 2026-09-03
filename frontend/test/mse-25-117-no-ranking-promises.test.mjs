import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const seoDir = path.join(root, "lib/seo");
const files = fs.readdirSync(seoDir).filter((name) => name.startsWith("local-search-") && name.endsWith(".js"));
const source = files.map((name) => fs.readFileSync(path.join(seoDir, name), "utf8")).join("\n");

test("MSE-25.117 runtime makes no guaranteed Google ranking claims", () => {
  assert.doesNotMatch(source, /garanti.*top\s*3|garanti.*premi[eè]re position|rank.*guarantee/i);
});
