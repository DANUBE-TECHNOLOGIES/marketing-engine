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

test("designer catalogue recognizes generated partner page structure as singleton blocks", () => {
  const catalogue = read("lib/page-builder-v2/block-catalog.js");

  for (const type of ["page-header", "partners-introduction", "partner-directory", "contact-cta"]) {
    assert.match(catalogue, new RegExp(`type: "${type}"[\\s\\S]*?singleton: true`));
  }
  assert.match(catalogue, /label: "En-tête de page"/);
  assert.match(catalogue, /label: "Introduction partenaires"/);
  assert.match(catalogue, /label: "Annuaire complet des partenaires"/);
  assert.match(catalogue, /label: "CTA contact agence"/);
});

test("partner directory styling follows public brand runtime variables", () => {
  const styles = read("components/public-site/renderers/PartnerDirectoryRenderer.module.css");

  assert.match(styles, /var\(--public-primary/);
  assert.match(styles, /var\(--public-secondary/);
  assert.match(styles, /var\(--public-accent/);
  assert.match(styles, /var\(--public-background/);
  assert.match(styles, /var\(--public-text/);
  assert.match(styles, /var\(--brand-button-radius/);
  assert.match(styles, /color-mix\(/);
});

test("public navigation promotes the partner page without exposing all secondary pages", () => {
  const header = read("components/public-site/PublicSiteHeader.js");

  assert.match(header, /PROMOTED_SECONDARY_SLUGS/);
  assert.match(header, /new Set\(\["partenaires"\]\)/);
  assert.match(header, /site\.navigation\?\.secondary/);
  assert.match(header, /PROMOTED_SECONDARY_SLUGS\.has\(pageSlug\(page\)\)/);
});
