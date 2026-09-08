import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const faqSource = await readFile(
  new URL("../lib/seo/destination-faq-schema.js", import.meta.url),
  "utf8"
);
const pageSource = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("destination FAQ has a stable canonical identity and graph links", () => {
  assert.match(faqSource, /`\$\{pageUrl\}#faq`/);
  assert.match(faqSource, /"@id": `\$\{pageUrl\}#webpage`/);
  assert.match(faqSource, /"@id": `\$\{pageUrl\}#destination`/);
  assert.match(faqSource, /url: pageUrl/);
});

test("destination FAQ uses only published question and answer fields", () => {
  assert.match(faqSource, /faq\?\.question/);
  assert.match(faqSource, /faq\?\.answer/);
  assert.match(faqSource, /filter\(\(faq\) => faq\.question && faq\.answer\)/);
  assert.doesNotMatch(faqSource, /knowsAbout|price|availability|stock/);
});

test("destination page uses the shared canonical FAQ builder", () => {
  assert.match(pageSource, /buildDestinationFaqSchema/);
  assert.doesNotMatch(pageSource, /function faqSchema\(/);
});
