import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const faq = await readFile(
  new URL("../components/public-site/renderers/FaqRenderer.js", import.meta.url),
  "utf8"
);

test("FAQ fallback is locally contextualized while editorial titles remain authoritative", () => {
  assert.match(faq, /Questions fréquentes sur votre agence à \$\{city\}/);
  assert.match(faq, /getSectionTitle/);
});

test("FAQ keeps crawlable native disclosure semantics", () => {
  assert.match(faq, /<details/);
  assert.match(faq, /<summary>/);
});
