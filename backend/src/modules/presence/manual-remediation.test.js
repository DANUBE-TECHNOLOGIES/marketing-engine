"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertManualProvider, manualActionTitle, buildManualRemediationPayload } = require("./manual-remediation");

test("manual provider helper resolves mapped directories", () => {
  const pagesJaunes = assertManualProvider("pagesjaunes");
  assert.equal(pagesJaunes.directoryName, "PagesJaunes");
  assert.equal(manualActionTitle(pagesJaunes.directoryName), "Présence locale — PagesJaunes");
});

test("manual remediation payload is explicit about human action and no external write", () => {
  const payload = buildManualRemediationPayload({
    providerKey: "pagesjaunes",
    listingId: 42,
    drift: ["phone", "website", "phone"],
    listingUrl: "https://www.pagesjaunes.fr/example",
    note: "Correction demandée au support"
  });
  assert.equal(payload.externalWrite, false);
  assert.equal(payload.requiresHumanAction, true);
  assert.deepEqual(payload.drift, ["phone", "website"]);
  assert.equal(payload.listingId, 42);
});

test("unmapped providers cannot start the legacy manual workflow", () => {
  assert.throws(() => assertManualProvider("tripadvisor"), /Aucun annuaire historique mappé/);
});
