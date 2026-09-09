import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const faqSchema = readFileSync(new URL("../lib/seo/page-faq-schema.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url), "utf8");
const services = readFileSync(new URL("../lib/seo/service-page-schema.js", import.meta.url), "utf8");

test("MSE-25.160 FAQPage receives a stable canonical identity and parent WebPage", () => {
  assert.match(faqSchema, /`\$\{canonicalUrl\}#faq`/);
  assert.match(faqSchema, /isPartOf/);
  assert.match(faqSchema, /`\$\{canonicalUrl\}#webpage`/);
  assert.match(faqSchema, /url: canonicalUrl/);
});

test("MSE-25.160 canonical WebPage links to FAQPage with hasPart", () => {
  assert.match(faqSchema, /linkFaqToWebPage/);
  assert.match(faqSchema, /hasPart/);
  assert.match(faqSchema, /faqReference/);
  assert.match(page, /linkFaqToWebPage\(baseWebPageSchema, faqSchema\)/);
  assert.match(page, /buildPageFaqSchema\(page, currentUrl\)/);
});

test("MSE-25.160 FAQ linkage preserves service mainEntity authority", () => {
  assert.match(services, /mainEntity: catalog/);
  assert.doesNotMatch(faqSchema, /mainEntity:\s*faq/);
  assert.doesNotMatch(faqSchema, /mainEntity:\s*\[/);
  assert.match(faqSchema, /hasPart: hasSameFaq \? existingParts : \[\.\.\.existingParts, faq\]/);
});

test("MSE-25.160 absent FAQ leaves WebPage unchanged", () => {
  assert.match(faqSchema, /if \(!webPage \|\| !faq\) return webPage/);
  assert.match(faqSchema, /if \(!items\.length\) return null/);
});
