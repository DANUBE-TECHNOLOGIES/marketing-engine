import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const footerPath = new URL("../components/public-site/PublicSiteFooter.js", import.meta.url);
const indexPath = new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url);

test("footer links to the singular public inspiration index", async () => {
  const source = await readFile(footerPath, "utf8");
  assert.match(source, /\$\{basePath\}\/inspiration/);
  assert.doesNotMatch(source, /\$\{basePath\}\/inspirations/);
});

test("public inspiration index exposes canonical metadata and agency scoped contents", async () => {
  const source = await readFile(indexPath, "utf8");
  assert.match(source, /canonicalPath/);
  assert.match(source, /getInspirations/);
  assert.match(source, /agencyId/);
  assert.match(source, /robots:\s*\{\s*index:\s*true/);
});
