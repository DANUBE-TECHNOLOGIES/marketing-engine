import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRepositorySource = await readFile(
  new URL("../../backend/src/modules/destination-engine/public-repository.js", import.meta.url),
  "utf8"
);
const destinationServiceSource = await readFile(
  new URL("../../backend/src/modules/destination-engine/service.js", import.meta.url),
  "utf8"
);
const destinationPageSource = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("public destination read only loads manual relations and never selects internal relation scores", () => {
  assert.match(publicRepositorySource, /relationsFrom:\s*\{/);
  assert.match(publicRepositorySource, /origin:\s*["']manual["']/);
  assert.match(publicRepositorySource, /target:\s*\{[\s\S]*status:\s*true[\s\S]*tenantId:\s*true/);
  assert.doesNotMatch(publicRepositorySource, /score:\s*true/);
  assert.doesNotMatch(publicRepositorySource, /metadata:\s*true/);
});

test("public editorial relation normalization requires manual published same-tenant exposed targets", () => {
  assert.match(destinationServiceSource, /normalizeEditorialRelations/);
  assert.match(destinationServiceSource, /relation\?\.origin[\s\S]*manual/);
  assert.match(destinationServiceSource, /target\?\.status[\s\S]*published/);
  assert.match(destinationServiceSource, /target\?\.tenantId/);
  assert.match(destinationServiceSource, /exposed\.has\(normalizedSlug\)/);
  assert.match(destinationServiceSource, /const publicDestination = \{ \.\.\.destination \}/);
  assert.match(destinationServiceSource, /delete publicDestination\.relationsFrom/);
  assert.match(destinationServiceSource, /editorialRelations,/);
});

test("visible destination relations and WebPage relatedLink use the same public href contract", () => {
  assert.match(destinationPageSource, /data\.editorialRelations/);
  assert.match(destinationPageSource, /relatedLink:\s*editorialRelations\.map\(\(item\) => absoluteUrl\(item\.href\)\)/);
  assert.match(destinationPageSource, /<Link key=\{item\.href\} href=\{item\.href\}>/);
  assert.match(destinationPageSource, /Vous aimerez aussi/);
});

test("editorial GEO relations do not publish recommendation scores or transactional claims", () => {
  assert.doesNotMatch(destinationPageSource, /item\.score/);
  assert.doesNotMatch(destinationPageSource, /item\.reasons/);
  assert.doesNotMatch(destinationPageSource, /availability:/);
  assert.doesNotMatch(destinationPageSource, /priceSpecification/);
  assert.doesNotMatch(destinationPageSource, /knowsAbout/);
});
