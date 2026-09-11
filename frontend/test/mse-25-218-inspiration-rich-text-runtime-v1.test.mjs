import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routeSource = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url),
  "utf8"
);

test("dedicated inspiration route reuses the canonical rich text renderer", () => {
  assert.match(routeSource, /import RichTextV2Renderer from/);
  assert.match(routeSource, /<RichTextV2Renderer/);
  assert.match(routeSource, /section=\{block\}/);
  assert.match(routeSource, /page=\{inspirationPage\}/);
});

test("published HTML rich text blocks are selected from the CMS page", () => {
  assert.match(routeSource, /function inspirationRichTextBlocks\(page\)/);
  assert.match(routeSource, /String\(content\.html \|\| ["']{2}\)\.trim\(\)/);
  assert.match(routeSource, /status === ["']published["']/);
  assert.match(routeSource, /visibleDesktop !== false \|\| item\?\.visibleMobile !== false/);
  assert.match(routeSource, /Boolean\(html\)/);
});

test("the dedicated route renders CMS rich text before the inspiration collection", () => {
  assert.match(routeSource, /const richTextBlocks = inspirationRichTextBlocks\(inspirationPage\)/);
  assert.match(routeSource, /\{richTextBlocks\.map\(\(block, index\) => \(/);
  const richTextIndex = routeSource.indexOf("{richTextBlocks.map");
  const gridIndex = routeSource.indexOf('className="public-inspiration-grid"');
  assert.ok(richTextIndex >= 0 && gridIndex > richTextIndex);
});

test("canonical slug, CMS H1 and collection schema behavior remain intact", () => {
  assert.match(routeSource, /publicSiteApi\.getPage\(siteSlug, ["']inspiration["']\)/);
  assert.match(routeSource, /if \(pageH1\) return pageH1/);
  assert.match(routeSource, /buildInspirationCollectionSchemas/);
  assert.match(routeSource, /consolidateCollectionWebPage/);
});
