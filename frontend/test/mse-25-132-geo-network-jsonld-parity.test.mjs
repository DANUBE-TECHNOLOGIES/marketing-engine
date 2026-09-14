import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const networkSchema = fs.readFileSync(
  path.join(root, "lib/seo/network-entity-schema.js"),
  "utf8"
);
const genericPage = fs.readFileSync(
  path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"),
  "utf8"
);
const destinationPage = fs.readFileSync(
  path.join(root, "components/destination/DestinationPage.js"),
  "utf8"
);
const referenceFacts = fs.readFileSync(
  path.join(root, "components/public-site/PublicAgencyReferenceFacts.js"),
  "utf8"
);

test("MSE-25.132 canonical agency JSON-LD matches visible Mondescale membership", () => {
  assert.match(networkSchema, /#mondescale-network/);
  assert.match(networkSchema, /name: "Mondescale Voyages"/);
  assert.match(networkSchema, /memberOf: mondescaleNetworkReference\(\)/);
  assert.match(referenceFacts, /itemProp="memberOf"/);
  assert.match(referenceFacts, /#mondescale-network/);
});

test("MSE-25.132 generic agency pages emit both network and network-aware agency entities", () => {
  assert.match(genericPage, /buildMondescaleNetworkSchema/);
  assert.match(genericPage, /buildNetworkAwareTravelAgencySchema/);
  assert.match(genericPage, /<JsonLd data=\{buildMondescaleNetworkSchema\(\)\} \/>/);
  assert.match(genericPage, /<JsonLd data=\{buildNetworkAwareTravelAgencySchema\(site\)\} \/>/);
});

test("MSE-25.132 destination pages preserve their graph while adding the same network identity", () => {
  assert.match(destinationPage, /buildMondescaleNetworkSchema/);
  assert.match(destinationPage, /buildNetworkAwareTravelAgencySchema/);
  assert.match(destinationPage, /const networkSchema = buildMondescaleNetworkSchema\(\)/);
  assert.match(destinationPage, /const agencySchema = buildNetworkAwareTravelAgencySchema\(site\)/);
  assert.match(destinationPage, /<JsonLd data=\{destinationWebPageSchema\} \/>/);
  assert.match(destinationPage, /<JsonLd data=\{destinationSchema\} \/>/);
});

test("MSE-25.132 network relation does not assert unsupported ownership or expertise", () => {
  assert.doesNotMatch(networkSchema, /parentOrganization|subOrganization|knowsAbout/);
});
