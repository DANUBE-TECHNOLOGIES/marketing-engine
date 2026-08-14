import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const footer = await readFile(
  new URL("../components/public-site/PublicSiteFooter.js", import.meta.url),
  "utf8"
);
const destination = await readFile(
  new URL("../app/agence/[siteSlug]/destination/[destinationSlug]/page.js", import.meta.url),
  "utf8"
);

test("footer exposes local NAP and only published generic journey links", () => {
  assert.match(footer, /<address/);
  assert.match(footer, /agency\.phone/);
  assert.match(footer, /agency\.email/);
  assert.match(footer, /hasServicesPage/);
  assert.match(footer, /hasDestinationsPage/);
  assert.match(footer, /hasContactPage/);
  assert.match(footer, /\/inspiration/);
});

test("destination metadata keeps the local query and compact Mondescale brand", () => {
  assert.match(destination, /Voyage à \$\{d\.name\} depuis \$\{city\}/);
  assert.match(destination, /\/mondescale\/i\.test\(name\) \? "Mondescale"/);
  assert.match(destination, /MAX_DESCRIPTION_LENGTH = 165/);
  assert.match(destination, /devis personnalisé/);
});
