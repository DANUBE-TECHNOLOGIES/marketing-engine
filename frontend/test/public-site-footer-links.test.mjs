import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const footerPath = path.join(
  dirname,
  "../components/public-site/PublicSiteFooter.js"
);
const source = fs.readFileSync(footerPath, "utf8");

test("footer links to the public inspiration landing route", () => {
  assert.match(source, /\$\{basePath\}\/inspiration/);
  assert.doesNotMatch(source, /\$\{basePath\}\/inspirations/);
});

test("footer only exposes the optional reviews link when navigation publishes it", () => {
  assert.match(source, /navigationSlugs\.has\("avis"\)/);
  assert.match(source, /hasReviewsPage\s*\?/);
});
