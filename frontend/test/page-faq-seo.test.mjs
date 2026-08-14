import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(
  new URL("../lib/seo/page-faq-schema.js", import.meta.url),
  "utf8"
);
const page = await readFile(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("FAQ schema is derived only from FAQ blocks with complete answers", () => {
  assert.match(schema, /sectionType\(section\)\.includes\("faq"\)/);
  assert.match(schema, /if \(!question \|\| !answer\) continue/);
  assert.match(schema, /"@type": "FAQPage"/);
  assert.match(schema, /"@type": "Question"/);
  assert.match(schema, /"@type": "Answer"/);
});

test("public local pages emit FAQ schema but legal pages do not", () => {
  assert.match(page, /buildPageFaqSchema/);
  assert.match(page, /const faqSchema = legalPage \? null : buildPageFaqSchema\(page\)/);
  assert.match(page, /faqSchema \? <JsonLd data=\{faqSchema\}/);
});
