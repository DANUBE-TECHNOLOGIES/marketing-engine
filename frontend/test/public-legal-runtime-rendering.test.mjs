import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSource = fs.readFileSync(
  path.resolve(here, "../app/agence/[siteSlug]/[[...pageSlug]]/page.js"),
  "utf8"
);
const documentSource = fs.readFileSync(
  path.resolve(here, "../components/public-site/LegalRuntimeDocument.js"),
  "utf8"
);

test("legal pages use the central runtime before designer fallback", () => {
  assert.match(pageSource, /fetchPublicBrandLegalRuntime/);
  assert.match(pageSource, /resolveLegalPageHtml/);
  assert.match(pageSource, /legalPage && legalRuntimeHtml/);
  assert.match(pageSource, /LegalRuntimeDocument/);
  assert.match(pageSource, /PublicSiteSections/);
});

test("legal runtime rendering never injects raw arbitrary HTML", () => {
  assert.match(documentSource, /replace\(\/<script/);
  assert.match(documentSource, /replace\(\/<style/);
  assert.match(documentSource, /replace\(\/<\[\^>\]\*>\/g/);
  assert.doesNotMatch(documentSource, /dangerouslySetInnerHTML/);
  assert.match(documentSource, /data-legal-source="runtime"/);
});
