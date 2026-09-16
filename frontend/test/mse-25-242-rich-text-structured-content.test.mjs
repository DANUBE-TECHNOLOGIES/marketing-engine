import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const renderer = fs.readFileSync(
  new URL(
    "../components/public-site/renderers/RichTextV2Renderer.js",
    import.meta.url
  ),
  "utf8"
);

const registry = fs.readFileSync(
  new URL(
    "../components/public-site/renderers/registry.js",
    import.meta.url
  ),
  "utf8"
);

test("agency-introduction is handled by RichTextV2Renderer", () => {
  assert.match(
    registry,
    /["']agency-introduction["']\s*:\s*RichTextV2Renderer/
  );
});

test("safeHref is imported from the existing rich-text helper", () => {
  assert.match(
    renderer,
    /paragraphFragments,\s*safeHref,?\s*\}\s*=\s*require\(["']\.\/safe-rich-text["']\)/
  );
});

test("singular paragraph is supported", () => {
  assert.match(
    renderer,
    /content\.paragraph/
  );

  assert.match(
    renderer,
    /singularParagraph/
  );
});

test("singular paragraph takes precedence over paragraphs array", () => {
  assert.match(
    renderer,
    /singularParagraph\s*\?\s*\[singularParagraph\]\s*:\s*Array\.isArray\(content\.paragraphs\)/
  );
});

test("structured paragraphs array remains the fallback", () => {
  assert.match(
    renderer,
    /Array\.isArray\(content\.paragraphs\)/
  );

  assert.match(
    renderer,
    /structuredParagraphs\.map/
  );
});

test("structured link is passed through safeHref", () => {
  assert.match(
    renderer,
    /safeHref\(content\.link\.href\)/
  );

  assert.match(
    renderer,
    /href=\{action\.href\}/
  );
});

test("raw content link href is never rendered directly", () => {
  assert.doesNotMatch(
    renderer,
    /href=\{content\.link\.href\}/
  );
});

test("safe HTML rich text support is preserved", () => {
  assert.match(
    renderer,
    /paragraphFragments\(content\.html\)/
  );

  assert.match(
    renderer,
    /fragment\.type === ["']link["']/
  );
});

test("legal renderer remains preserved", () => {
  assert.match(renderer, /isLegalPage\(page\)/);
  assert.match(renderer, /<LegalDocument/);
});
