import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-snapshot.js"), "utf8");

test("MSE-25.117 snapshot generation has no persistence or network side effect", () => {
  assert.doesNotMatch(source, /fetch\(|axios|prisma|writeFile|database|POST|PUT|PATCH|DELETE/i);
});
