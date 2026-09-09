import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const helper = read("lib/seo/canonical-jsonld.js");
const component = read("components/JsonLd.js");

test("MSE-25.163 BreadcrumbList identity comes only from its final published item URL", () => {
  assert.match(helper, /const last = items\[items\.length - 1\]/);
  assert.match(helper, /`\$\{pageUrl\}#breadcrumb`/);
  assert.match(helper, /mainEntityOfPage/);
  assert.match(helper, /`\$\{pageUrl\}#webpage`/);
});

test("MSE-25.163 WebPage references the same canonical BreadcrumbList identity", () => {
  assert.match(helper, /hasSchemaType\(data, "WebPage"\)/);
  assert.match(helper, /breadcrumb: data\.breadcrumb \|\|/);
  assert.match(helper, /"@type": "BreadcrumbList"/);
  assert.match(helper, /"@id": `\$\{pageUrl\}#breadcrumb`/);
});

test("MSE-25.163 JsonLd normalizes before serialization without changing renderer responsibilities", () => {
  assert.match(component, /canonicalizeJsonLd\(data\)/);
  assert.match(component, /JSON\.stringify\(normalized\)/);
  assert.match(helper, /return data;/);
});

test("MSE-25.163 does not manufacture breadcrumb items, commercial facts or expertise", () => {
  assert.match(helper, /Array\.isArray\(data\?\.itemListElement\) \? data\.itemListElement : \[\]/);
  assert.doesNotMatch(helper, /itemListElement\s*:\s*\[/);
  assert.doesNotMatch(helper, /price|availability|stock|booking|aggregateRating|knowsAbout/i);
});
