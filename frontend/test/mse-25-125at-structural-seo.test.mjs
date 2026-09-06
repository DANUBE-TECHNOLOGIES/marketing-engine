import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(
  import.meta.dirname,
  ".."
);

function read(relative) {
  return fs.readFileSync(
    path.join(root, relative),
    "utf8"
  );
}

test(
  "MSE-25.125AT suppresses shared commercial hero on legal pages",
  () => {
    const source = read(
      "app/agence/[siteSlug]/[[...pageSlug]]/page.js"
    );

    assert.match(
      source,
      /\{!legalPage\s*&&\s*sharedHero\s*\?\s*\(/
    );

    assert.match(
      source,
      /<LegalRuntimeDocument\s+title=\{page\.title\}\s+html=\{legalRuntimeHtml\}\s*\/>/
    );
  }
);

test(
  "MSE-25.125AT keeps legal pages excluded from fallback headings",
  () => {
    const source = read(
      "app/agence/[siteSlug]/[[...pageSlug]]/page.js"
    );

    assert.match(
      source,
      /needsFallbackHeading\s*=\s*!legalPage/
    );
  }
);
