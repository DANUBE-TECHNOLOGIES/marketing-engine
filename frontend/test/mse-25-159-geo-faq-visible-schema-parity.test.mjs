import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync(new URL("../lib/public-faq.js", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../components/public-site/renderers/FaqRenderer.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../lib/seo/page-faq-schema.js", import.meta.url), "utf8");

test("MSE-25.159 visible FAQ and FAQPage share one item resolver", () => {
  assert.match(renderer, /faqItemsForSection/);
  assert.match(schema, /faqItemsForPage/);
  assert.match(shared, /faqItemsForSection/);
  assert.match(shared, /faqItemsForPage/);
});

test("MSE-25.159 shared FAQ resolver uses the same public visibility and ordering", () => {
  assert.match(shared, /sortSections/);
  assert.match(shared, /filter\(isSectionVisible\)/);
  assert.match(shared, /getSectionType\(section\)\.includes\("faq"\)/);
  assert.doesNotMatch(schema, /slice\(0,\s*20\)/);
  assert.doesNotMatch(schema, /new Set/);
});

test("MSE-25.159 question and answer fallbacks are identical for visible and structured output", () => {
  assert.match(shared, /item\?\.question \|\| item\?\.title/);
  assert.match(shared, /item\?\.answer \|\| item\?\.text \|\| item\?\.description \|\| item\?\.content/);
  assert.match(schema, /name: item\.question/);
  assert.match(schema, /text: item\.answer/);
});
