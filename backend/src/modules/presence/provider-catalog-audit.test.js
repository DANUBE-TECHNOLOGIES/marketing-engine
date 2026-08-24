"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { auditProviderCatalog } = require("./provider-catalog-audit");
const { listPresenceProviders } = require("./provider-registry");
const { directoryNameForProviderKey } = require("./directory-bridge");

function fullCatalog() {
  return listPresenceProviders().map((provider, index) => ({ id: index + 1, name: directoryNameForProviderKey(provider.key), active: true })).filter((item) => item.name);
}

test("provider catalog is ready only when every mapped provider has a LocalDirectory", () => {
  const audit = auditProviderCatalog(fullCatalog(), {});
  assert.equal(audit.ready, true);
  assert.equal(audit.summary.missing, 0);
});

test("provider catalog exposes missing and inactive directories separately", () => {
  const catalog = fullCatalog();
  const missingName = catalog[0].name;
  const inactiveName = catalog[1].name;
  const partial = catalog.filter((item) => item.name !== missingName).map((item) => item.name === inactiveName ? { ...item, active: false } : item);
  const audit = auditProviderCatalog(partial, {});
  assert.equal(audit.ready, false);
  assert.equal(audit.summary.missing, 1);
  assert.equal(audit.summary.inactive, 1);
});
