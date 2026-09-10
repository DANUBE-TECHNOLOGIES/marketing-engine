import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/LocalContentContext.js"),
  "utf8",
);

test("MSE-25.193 local context navigation comes only from grounded public navigation", () => {
  assert.match(source, /uniquePublicNavigation\(site\)/);
  assert.match(source, /const currentSlug = pageSlug\(currentPage\)/);
  assert.match(source, /pageSlug\(candidate\) !== currentSlug/);
  assert.match(source, /pageHref\(site\.slug, candidate\)/);
  assert.match(source, /title: candidate\.title/);
});

test("MSE-25.193 local context does not manufacture fixed agency subroutes", () => {
  assert.doesNotMatch(source, /`\$\{root\}\/services`/);
  assert.doesNotMatch(source, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(source, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(source, /`\$\{root\}\/contact`/);
  assert.doesNotMatch(source, /const root =/);
});

test("MSE-25.193 related navigation disappears when there is no grounded alternative", () => {
  assert.match(source, /const relatedPages = publishedContextNavigation\(site, page\)/);
  assert.match(source, /\{relatedPages\.length \? \(/);
  assert.match(source, /relatedPages\.map\(\(candidate\) =>/);
  assert.match(source, /href=\{candidate\.href\}/);
  assert.match(source, /\{candidate\.title\}/);
});
