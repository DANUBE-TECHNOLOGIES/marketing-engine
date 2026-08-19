import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("public partner page has explicit header, introduction and directory renderers", () => {
  const registry = read("components/public-site/renderers/registry.js");
  const header = read("components/public-site/renderers/PageHeaderRenderer.js");
  const directory = read("components/public-site/renderers/PartnerDirectoryRenderer.js");

  assert.match(registry, /"page-header":\s*PageHeaderRenderer/);
  assert.match(registry, /"partners-introduction":\s*RichTextV2Renderer/);
  assert.match(registry, /"partner-directory":\s*PartnerDirectoryRenderer/);
  assert.match(header, /<h1>\{title\}<\/h1>/);
  assert.match(header, /content\.introduction/);
  assert.match(directory, /getPublishablePartnerProfiles/);
  assert.match(directory, /Catégories de partenaires/);
});

test("public navigation promotes the partner page without exposing all secondary pages", () => {
  const header = read("components/public-site/PublicSiteHeader.js");

  assert.match(header, /PROMOTED_SECONDARY_SLUGS/);
  assert.match(header, /new Set\(\["partenaires"\]\)/);
  assert.match(header, /site\.navigation\?\.secondary/);
  assert.match(header, /PROMOTED_SECONDARY_SLUGS\.has\(pageSlug\(page\)\)/);
});
