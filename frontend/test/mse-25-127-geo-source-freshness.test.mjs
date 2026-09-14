import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.127 destination WebPage exposes publication and modification freshness", () => {
  assert.match(jsonLd, /const datePublished = isoDate\(destination\.publishedAt \|\| destination\.createdAt\)/);
  assert.match(jsonLd, /const dateModified = isoDate\(destination\.updatedAt \|\| destination\.publishedAt \|\| destination\.createdAt\)/);
  assert.match(jsonLd, /datePublished,/);
  assert.match(jsonLd, /dateModified,/);
});

test("MSE-25.127 freshness uses the same strict ISO normalization as generic page semantics", () => {
  assert.match(jsonLd, /import \{ isoDate \} from "\.\/page-semantics-schema"/);
});
