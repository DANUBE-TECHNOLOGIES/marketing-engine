import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const destinationApi = await readFile(
  new URL("../lib/destination-api.js", import.meta.url),
  "utf8"
);
const destinationPage = await readFile(
  new URL("../app/agence/[siteSlug]/destination/[destinationSlug]/page.js", import.meta.url),
  "utf8"
);

test("public destination API distinguishes a real 404 from backend failures", () => {
  assert.match(destinationApi, /response\.status === 404/);
  assert.match(destinationApi, /PublicDestinationNotFoundError/);
  assert.match(destinationApi, /if \(!response\.ok\)/);
  assert.doesNotMatch(destinationApi, /if \(!response\.ok\) return null/);
});

test("destination page only maps explicit not-found responses to notFound", () => {
  assert.match(destinationPage, /instanceof PublicDestinationNotFoundError/);
  assert.match(destinationPage, /notFound\(\)/);
  assert.match(destinationPage, /throw error/);
});
