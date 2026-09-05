"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractResult,
  NO_SEARCH_RESULTS_TASK_CODE,
} = require("../src/modules/ranking-grid/dataforseo-provider");

test("DataForSEO task 40102 is a valid measured absence and preserves cost", () => {
  const result = extractResult({
    status_code: 20000,
    status_message: "Ok.",
    tasks: [{
      status_code: NO_SEARCH_RESULTS_TASK_CODE,
      status_message: "No Search Results.",
      cost: 0.002,
      result: null,
    }],
  }, { placeId: "ChIJ-test" });

  assert.equal(result.found, false);
  assert.equal(result.position, null);
  assert.equal(result.absolutePosition, null);
  assert.equal(result.cost, 0.002);
  assert.equal(result.providerMetadata.noSearchResults, true);
  assert.equal(result.providerMetadata.taskStatusCode, 40102);
  assert.equal(result.providerMetadata.taskStatusMessage, "No Search Results.");
});

test("other non-success DataForSEO task codes remain technical errors", () => {
  assert.throws(
    () => extractResult({
      status_code: 20000,
      tasks: [{
        status_code: 40501,
        status_message: "Task failed",
      }],
    }, {}),
    (error) => error?.code === "DATAFORSEO_TASK_40501",
  );
});
