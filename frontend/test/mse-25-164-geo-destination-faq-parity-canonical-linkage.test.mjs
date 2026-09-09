import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const helper = read("lib/seo/destination-faq-schema.js");
const page = read("components/destination/DestinationPage.js");

test("MSE-25.164 visible destination FAQ and FAQPage share one resolver", () => {
  assert.match(helper, /export function destinationFaqItems\(data\)/);
  assert.match(helper, /\.filter\(\(faq\) => faq\.question && faq\.answer\)/);
  assert.match(helper, /const items = destinationFaqItems\(data\)/);
  assert.match(page, /const faqs = destinationFaqItems\(data\)/);
  assert.match(page, /faqs\.map\(\(faq, index\)/);
});

test("MSE-25.164 destination FAQ keeps stable canonical identity and parent page", () => {
  assert.match(helper, /"@id": `\$\{pageUrl\}#faq`/);
  assert.match(helper, /isPartOf:/);
  assert.match(helper, /"@id": `\$\{pageUrl\}#webpage`/);
  assert.match(helper, /"@id": `\$\{pageUrl\}#destination`/);
});

test("MSE-25.164 destination WebPage links FAQ with hasPart without replacing mainEntity", () => {
  assert.match(helper, /export function linkDestinationFaqToWebPage/);
  assert.match(helper, /hasPart:/);
  assert.match(page, /linkDestinationFaqToWebPage\(/);
  assert.match(page, /baseDestinationWebPageSchema/);
  assert.doesNotMatch(helper, /mainEntity\s*:/);
});

test("MSE-25.164 destination FAQ GEO adds no transactional or inferred expertise claims", () => {
  assert.doesNotMatch(helper, /price|availability|stock|booking|aggregateRating|knowsAbout/i);
});
