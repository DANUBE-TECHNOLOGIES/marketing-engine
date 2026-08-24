"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertManualProvider, manualActionTitle, buildManualRemediationPayload } = require("./manual-remediation");
const { directoryDefaultsForProvider } = require("./provider-directory-catalog");

test("manual provider helper resolves mapped directories", () => {
  const pagesJaunes = assertManualProvider("pagesjaunes");
  assert.equal(pagesJaunes.directoryName, "PagesJaunes");
  assert.equal(manualActionTitle(pagesJaunes.directoryName), "Présence locale — PagesJaunes");
  assert.equal(assertManualProvider("tripadvisor").directoryName, "Tripadvisor");
  assert.equal(assertManualProvider("petit_fute").directoryName, "Petit Futé");
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

test("provider directory defaults cover newly aligned providers", () => {
  assert.equal(directoryDefaultsForProvider("here").submissionMode, "submission_api");
  assert.equal(directoryDefaultsForProvider("tripadvisor").name, "Tripadvisor");
  assert.equal(directoryDefaultsForProvider("petit_fute").name, "Petit Futé");
});

test("unknown providers cannot start the manual workflow", () => {
  assert.throws(() => assertManualProvider("unknown_provider"), /Provider Presence inconnu/);
});
