import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const component = fs.readFileSync(
  path.join(root, "components/public-site/PublicAgencyReferenceFacts.js"),
  "utf8"
);

test("MSE-25.129 agency is explicitly linked to the Mondescale network", () => {
  assert.match(component, /itemProp="memberOf"/);
  assert.match(component, /itemType="https:\/\/schema\.org\/Organization"/);
  assert.match(component, /#mondescale-network/);
  assert.match(component, /Mondescale Voyages/);
  assert.match(component, /itemProp="url"/);
});

test("MSE-25.129 uses membership, not an unsupported ownership hierarchy", () => {
  assert.doesNotMatch(component, /parentOrganization/);
  assert.doesNotMatch(component, /subOrganization/);
  assert.doesNotMatch(component, /knowsAbout/);
});
